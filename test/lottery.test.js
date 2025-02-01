const { expect } = require("chai");
const { ethers } = require("hardhat");

// Mocking Chainlink VRF
const VRF_COORDINATOR_MOCK = "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B";
const LINK_TOKEN_MOCK = "0x779877A7B0D9E8603169DdbD7836e478b4624789";
const KEY_HASH =
  "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae";
const FEE = ethers.parseEther("0.1");

let Lottery, lottery, owner, addr1, addr2, addr3;

describe("Lottery Contract", function () {
  beforeEach(async function () {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();
    Lottery = await ethers.getContractFactory("Lottery");
    lottery = await Lottery.deploy(
      VRF_COORDINATOR_MOCK,
      LINK_TOKEN_MOCK,
      KEY_HASH,
      FEE
    );
    await lottery.waitForDeployment();
  });

  it("Should allow users to buy tickets", async function () {
    await lottery
      .connect(addr1)
      .buyTicket({ value: ethers.parseEther("0.01") });
    await lottery
      .connect(addr2)
      .buyTicket({ value: ethers.parseEther("0.01") });

    expect(await lottery.players(0)).to.equal(addr1.address);
    expect(await lottery.players(1)).to.equal(addr2.address);
  });

  it("Should not allow ticket purchase with incorrect ETH amount", async function () {
    await expect(
      lottery.connect(addr1).buyTicket({ value: ethers.parseEther("0.02") })
    ).to.be.revertedWith("Incorrect ETH amount");
  });

  it("Should not allow ticket purchase after lottery ends", async function () {
    await network.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]); // Increase time by 7 days
    await network.provider.send("evm_mine");

    await expect(
      lottery.connect(addr1).buyTicket({ value: ethers.parseEther("0.01") })
    ).to.be.revertedWith("Lottery ended");
  });

  it("Should allow only owner to request a random winner", async function () {
    // await expect(
    //   lottery.connect(addr3).requestRandomWinner()
    // ).to.be.revertedWith("OwnableUnauthorizedAccount");

    await expect(lottery.connect(addr1).requestRandomWinner()).to.be.revertedWithCustomError(lottery, "OwnableUnauthorizedAccount");

  });

  it("Should select a winner and distribute funds correctly", async function () {
    await lottery
      .connect(addr1)
      .buyTicket({ value: ethers.parseEther("0.01") });
    await lottery
      .connect(addr2)
      .buyTicket({ value: ethers.parseEther("0.01") });

    await network.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
    await network.provider.send("evm_mine");

    await lottery.connect(owner).requestRandomWinner();
    const winnerIndex = 1; // Simulating randomness outcome
    const winner = [addr1, addr2][winnerIndex];
    await lottery.fulfillRandomness("0x", winnerIndex);

    expect(await lottery.recentWinner()).to.equal(winner.address);
  });
});
