const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SubscriptionService", function () {
    let SubscriptionService, subscriptionServiceContract, Token, token;
    let owner, user1, user2;
    let subscriptionServiceContractAddress;
 
    const subscriptionFee = ethers.parseEther("1");

    beforeEach(async function () {
        [owner, user1, user2] = await ethers.getSigners();

        Token = await ethers.getContractFactory("MockERC20");

        token = await Token.deploy("Test Token", "TTK", ethers.parseEther("1000"));
        await token.waitForDeployment();
        let tokenAddress;
        SubscriptionService = await ethers.getContractFactory("SubscriptionService");

        await token.getAddress().then((address) => {
            tokenAddress = address
        })

        subscriptionServiceContract = await SubscriptionService.deploy(tokenAddress, subscriptionFee);
        await subscriptionServiceContract.waitForDeployment();
        await subscriptionServiceContract.getAddress().then((address) => {
            subscriptionServiceContractAddress = address;
        })
        await token.transfer(user1.address, ethers.parseEther("10"));
        await token.transfer(user2.address, ethers.parseEther("10"));
    });

    it("should allow a user to subscribe", async function () {
        await token.connect(user1).approve(subscriptionServiceContractAddress, subscriptionFee);
        await subscriptionServiceContract.connect(user1).subscribe();

        const nextPaymentDue = await subscriptionServiceContract.nextPaymentDue(user1.address);
        expect(nextPaymentDue).to.be.gt(0);
    });

    it("should not allow a user to subscribe twice", async function () {
        await token.connect(user1).approve(subscriptionServiceContractAddress, subscriptionFee);
        await subscriptionServiceContract.connect(user1).subscribe();
        await expect(subscriptionServiceContract.connect(user1).subscribe()).to.be.revertedWith("Already subscribed");
    });

    it("should allow owner to charge a subscribed user", async function () {
        await token.connect(user1).approve(subscriptionServiceContractAddress, subscriptionFee);
        await subscriptionServiceContract.connect(user1).subscribe();

        await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
        await ethers.provider.send("evm_mine");

        await token.connect(user1).approve(subscriptionServiceContractAddress, subscriptionFee);
        await subscriptionServiceContract.connect(owner).chargeSubscription(user1.address);
    });

    it("should allow a user to unsubscribe", async function () {
        await token.connect(user1).approve(subscriptionServiceContractAddress, subscriptionFee);
        await subscriptionServiceContract.connect(user1).subscribe();
        await subscriptionServiceContract.connect(user1).unsubscribe();

        const nextPaymentDue = await subscriptionServiceContract.nextPaymentDue(user1.address);
        expect(nextPaymentDue).to.equal(0);
    });

    it("should allow owner to pause and unpause a user", async function () {
        await subscriptionServiceContract.connect(owner).pauseUser(user1.address);
        expect(await subscriptionServiceContract.isPaused(user1.address)).to.be.true;

        await subscriptionServiceContract.connect(owner).UnpausedUser(user1.address);
        expect(await subscriptionServiceContract.isPaused(user1.address)).to.be.false;
    });

    it("should allow owner to update subscription fee", async function () {
        const newFee = ethers.parseEther("2");
        await subscriptionServiceContract.connect(owner).updateSubscriptionFee(newFee);
        expect(await subscriptionServiceContract.subscriptionFee()).to.equal(newFee);
    });

    it("should allow owner to withdraw tokens", async function () {
        const amount = ethers.parseEther("1");
        await token.connect(user1).approve(subscriptionServiceContractAddress, amount);
        await subscriptionServiceContract.connect(user1).subscribe();
        await subscriptionServiceContract.connect(owner).withdrawTokens(owner.address, amount);
        expect(await token.balanceOf(owner.address)).to.be.gte(amount);
    });
});
