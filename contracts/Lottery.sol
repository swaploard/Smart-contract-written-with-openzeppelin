// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBase.sol";

contract Lottery is Ownable, ReentrancyGuard, VRFConsumerBase {
    address[] public players;
    uint256 public lotteryEnd;
    uint256 public ticketPrice = 0.01 ether;
    uint256 public feePercentage = 5;
    bytes32 internal keyHash;
    uint256 internal fee;
    address public recentWinner;

    event TicketPurchased(address indexed player);
    event WinnerSelected(address indexed winner, uint256 amount);

    constructor(
        address vrfCoordinator,
        address linkToken,
        bytes32 _keyHash,
        uint256 _fee
    ) VRFConsumerBase(vrfCoordinator, linkToken) Ownable(msg.sender) {
        keyHash = _keyHash;
        fee = _fee;
        lotteryEnd = block.timestamp + 7 days;
    }

    function buyTicket() external payable nonReentrant {
        require(msg.value == ticketPrice, "Incorrect ETH amount");
        require(block.timestamp < lotteryEnd, "Lottery ended");
        players.push(msg.sender);
        emit TicketPurchased(msg.sender);
    }

    function requestRandomWinner() external onlyOwner {
        require(block.timestamp >= lotteryEnd, "Lottery still running");
        require(players.length > 0, "No players joined");
        require(LINK.balanceOf(address(this)) >= fee, "Not enough LINK");
        requestRandomness(keyHash, fee);
    }

    function fulfillRandomness(bytes32, uint256 randomness) internal override {
        uint256 winnerIndex = randomness % players.length;
        recentWinner = players[winnerIndex];
        uint256 prizePool = address(this).balance;
        uint256 ownerFee = (prizePool * feePercentage) / 100;
        uint256 winnerAmount = prizePool - ownerFee;
        payable(owner()).transfer(ownerFee);
        payable(recentWinner).transfer(winnerAmount);
        emit WinnerSelected(recentWinner, winnerAmount);
        resetLottery();
    }

    function resetLottery() private {
        players = new address[](0);
        lotteryEnd = block.timestamp + 7 days;
    }
}
