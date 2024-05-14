//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.20;

import {ISoboToken} from "./interfaces/ISoboToken.sol";
import {ERC20} from "./ERC20.sol";
import {IUniswapV2Factory} from "./interfaces/IUniswapV2Factory.sol";
import {IUniswapV2Pair} from "./interfaces/IUniswapV2Pair.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract SoboToken is ISoboToken, ERC20("SONIC BOOM", "SOBO"), Ownable(msg.sender) {
    IUniswapV2Factory public uniswapFactory;
    address public uniswapRouter;
    address public wftmTokenAddress;
    address public pairAddress;
    bool public liquidityAdded;

    constructor(address _factoryAddress, address _routerAddress, address _wftmToken) {
        if (_factoryAddress == address(0)) {
            revert SoboToken__FactoryZeroAddress();
        }
        if (_routerAddress == address(0)) {
            revert SoboToken__RouterZeroAddress();
        }
        if (_wftmToken == address(0)) {
            revert SoboToken__WftmTokenNotSet();
        }
        uniswapFactory = IUniswapV2Factory(_factoryAddress);
        uniswapRouter = _routerAddress;
        wftmTokenAddress = _wftmToken;
        _mint(msg.sender, 420_000_000 * (10 ** uint256(decimals())));
    }

    function setLiquidityAdded(bool _liquidityAdded) public onlyOwner {
        liquidityAdded = _liquidityAdded;
        pairAddress = uniswapFactory.getPair(address(this), wftmTokenAddress);
        if (pairAddress == address(0)) {
            revert SoboToken__PairDoesNotExist();
        }
        emit SoboToken__PairAddressSet(pairAddress);
        emit SoboToken__LiquidityAdded(_liquidityAdded);
    }

    function beforeTokenTransfer(uint256 value) internal view override {
        _checkLiquidity(value);
    }

    function _checkLiquidity(uint256 transferAmount) private view {
        // Wait for Liquidity before limiting..
        if (!liquidityAdded) {
            return;
        }
        // Allow Non Uniswap router senders to bypass the liquidity check
        if (msg.sender != address(uniswapRouter)) {
            return; 
        }

        // get Reserves
        (uint256 reserve0, uint256 reserve1,) = IUniswapV2Pair(pairAddress).getReserves();

        // Ensure correct ordering of reserves
        (uint256 soboReserve,) =
            address(this) == IUniswapV2Pair(pairAddress).token0() ? (reserve0, reserve1) : (reserve1, reserve0);

        // Check if the transfer amount is greater than 1% of the SOBO reserve
        if (transferAmount > (soboReserve * 1) / 100) {
            revert SoboToken__AmountTooHigh(transferAmount);
        }
    }
}
