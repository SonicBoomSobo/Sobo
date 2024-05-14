//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.20;

contract ISoboToken {
    error SoboToken__AmountTooHigh(uint256 amount);
    error SoboToken__PairDoesNotExist();
    error SoboToken__FactoryZeroAddress();
    error SoboToken__RouterZeroAddress();
    error SoboToken__WftmTokenNotSet();

    event SoboToken__LiquidityAdded(bool liquidityAdded);
    event SoboToken__PairAddressSet(address pairAddress);
}
