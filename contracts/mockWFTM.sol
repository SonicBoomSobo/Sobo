//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/ILiquidityValueCalculator.sol";
import "./interfaces/IUniswapV2Factory.sol";
import "./interfaces/IUniswapV2Pair.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockWFTM is ERC20 {
    constructor() ERC20("Wrapped Fantom", "WFTM") {
        _mint(msg.sender, 420_000_000 * (10 ** uint256(decimals())));
    }
}
