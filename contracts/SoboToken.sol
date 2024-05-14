//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.20;

import "./ERC20.sol";
import "./interfaces/ILiquidityValueCalculator.sol";
import "./interfaces/IUniswapV2Factory.sol";
import "./interfaces/IUniswapV2Pair.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SoboToken is ERC20, Ownable(msg.sender) {
    IUniswapV2Factory public uniswapFactory;
    address public wftmTokenAddress;

    constructor(address _factoryAddress, address _wftmToken) ERC20("SONIC BOOM", "SOBO") {
        uniswapFactory = IUniswapV2Factory(_factoryAddress);
        wftmTokenAddress = _wftmToken;
        _mint(msg.sender, 420_000_000 * (10 ** uint256(decimals())));
    }

    function _checkLiquidity(uint256 transferAmount) private view returns (bool) {
        address pairAddress = uniswapFactory.getPair(address(this), wftmTokenAddress);
        if (pairAddress == address(0)) {
            return false; // Pair does not exist
        }

        (uint256 reserve0, uint256 reserve1,) = IUniswapV2Pair(pairAddress).getReserves();
        // Ensure correct ordering of reserves
        (uint256 soboReserve,) =
            address(this) == IUniswapV2Pair(pairAddress).token0() ? (reserve0, reserve1) : (reserve1, reserve0);

        // Check if SOBO reserve is greater than 1% of the transfer amount
        return soboReserve > transferAmount / 100;
    }
}
