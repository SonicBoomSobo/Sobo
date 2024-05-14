//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockWFTM is ERC20 {
    constructor() ERC20("Wrapped Fantom", "WFTM") {
        _mint(msg.sender, 420_000_000 * (10 ** uint256(decimals())));
    }
}
