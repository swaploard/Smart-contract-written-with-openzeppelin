// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title SubscriptionService
 * @notice A contract that manages a subscription service
 * @dev Implements a simple subscription service that charges users a fee every 30 days
 */
contract SubscriptionService is Ownable {
    IERC20 public token;
    uint256 public subscriptionFee;
    mapping(address => uint256) public nextPaymentDue;
    mapping(address => bool) public isPaused;

    event Subscribed(address indexed user, uint256 nextDue);
    event Unsubscribed(address indexed user);
    event FeeUpdated(uint256 newFee);
    event Payment(address indexed user, uint256 amount);
    event UserPaused(address indexed user);
    event UserUnpaused(address indexed user);

    /**
     * @notice Initializes the contract with the token and the subscription fee
     * @param _token The token that will be used for the subscription
     * @param _subscriptionFee The amount of tokens that will be charged every 30 days
     */
    constructor(IERC20 _token, uint256 _subscriptionFee) Ownable(msg.sender) {
        token = _token;
        subscriptionFee = _subscriptionFee;
    }

    /**
     * @notice Pauses the subscription for a user
     * @dev Only the owner can pause a user's subscription
     * @param user The address of the user to pause
     */
    function pauseUser(address user) public onlyOwner {
        isPaused[user] = true;
    }

    /**
     * @notice Unpauses a user's subscription
     * @dev Only the owner can unpause a user's subscription
     * @param user The address of the user to unpause
     */
    function UnpausedUser(address user) public onlyOwner {
        isPaused[user] = false;
    }

    /**
     * @notice Subscribes a user to the service
     * @dev Users can only subscribe if they are not already subscribed
     */
    function subscribe() external {
        require(!isPaused[msg.sender], "User has paused the subscription");
        require(nextPaymentDue[msg.sender] == 0, "Already subscribed");
        require(token.transferFrom(msg.sender, address(this), subscriptionFee));

        nextPaymentDue[msg.sender] = block.timestamp + 30 days;
    }

    /**
     * @notice Charges a user for their subscription
     * @dev Only the owner can charge a user
     * @param user The address of the user to charge
     */
    function chargeSubscription(address user) external {
        require(!isPaused[user], "Subscription is paused for this user");
        require(nextPaymentDue[user] > 0, "Not subscribed");
        require(block.timestamp >= nextPaymentDue[user], "Payment not due yet");
        require(
            token.transferFrom(user, address(this), subscriptionFee),
            "Payment failed"
        );
        nextPaymentDue[user] = block.timestamp + 30 days;
        emit Payment(user, subscriptionFee);
    }

    /**
     * @notice Unsubscribes a user from the service
     * @dev Users can only unsubscribe if they are subscribed
     */
    function unsubscribe() external {
        require(nextPaymentDue[msg.sender] > 0, "Not subscribed");
        nextPaymentDue[msg.sender] = 0;
        emit Unsubscribed(msg.sender);
    }

    /**
     * @notice Updates the subscription fee
     * @dev Only the owner can update the subscription fee
     * @param newFee The new subscription fee
     */
    function updateSubscriptionFee(uint256 newFee) external {
        subscriptionFee = newFee;
        emit FeeUpdated(newFee);
    }

    /**
     * @notice Withdraws tokens from the contract
     * @dev Only the owner can withdraw tokens
     * @param to The address to withdraw the tokens to
     * @param amount The amount of tokens to withdraw
     */
    function withdrawTokens(address to, uint256 amount) external onlyOwner {
        require(token.transfer(to, amount), "Withdrawal failed");
    }
}

