const hre = require('hardhat')

const testnetRouterAddress = "0xa6AD18C2aC47803E193F75c3677b14BF19B94883"
const testnetFactoryAddress = "0xEE4bC42157cf65291Ba2FE839AE127e3Cc76f741"
let testnetWftmAddress = "0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83"
let soboAddress = "0x0000000000000000000000000000000000000000"

const testnet = true

async function main() {
  const [deployer] = await hre.ethers.getSigners()
  if (testnet) {
    //  Deploy Mock WFTM
    const wftm = await hre.ethers.deployContract('MockWFTM', [])
    const wftmDeployed = await wftm.deploymentTransaction().wait(1);
    testnetWftmAddress = wftmDeployed.contractAddress
        console.log('WFTM deployed to:', testnetWftmAddress)
  }

  // Deploy SOBO
  const sobo = await hre.ethers.deployContract('SoboToken', [testnetFactoryAddress, testnetWftmAddress])
  const soboDeployed = await sobo.deploymentTransaction().wait(5)
  soboAddress = soboDeployed.contractAddress

  console.log('SOBO deployed to:', soboAddress)

  // await hre.run(`verify:verify`, {
  //   address: soboAddress,
  //   constructorArguments: [testnetFactoryAddress, testnetWftmAddress]
  // })

  // Approve router to spend tokens
  const totalSupply = await sobo.totalSupply()
  const liquiditySoboAmount = totalSupply * BigInt(85) / BigInt(100); // 85% of total supply // 85% of total supply
  await sobo.approve(testnetRouterAddress, liquiditySoboAmount)

  // Get router contract
  const router = await hre.ethers.getContractAt('IUniswapV2Router', testnetRouterAddress, deployer)

  // Add Liquidity
  const wftmAmount = hre.ethers.parseUnits('100000', 'ether') // 100,000 wFTM
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20 // 20 minutes from the current Unix time
  await router.addLiquidity(
    soboAddress,
    testnetWftmAddress,
    liquiditySoboAmount,
    wftmAmount,
    0, // min liquidity tokens
    0, // min wFTM
    deployer.address,
    deadline
  )
  console.log('Liquidity added to Uniswap V2')

  // Renounce Ownership
  await sobo.renounceOwnership()
  console.log('Ownership renounced')

  // TestSwap of < 1% of the SOBO reserve - Should Pass
  const swapAmount = totalSupply * BigInt(5) / BigInt(1000) // 0.5% of total supply
  try {
    await router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      swapAmount,
      0, // minimum amount out
      [soboAddress, testnetWftmAddress],
      deployer.address,
      deadline
    )
    console.log('Test swap of <1% passed')
  } catch (error) {
    console.error('Test swap of <1% failed:', error)
  }

  // TestSwap of > 1% of the SOBO reserve - Should Fail
  const largeSwapAmount = totalSupply * BigInt(2) / BigInt(100) // 2% of total supply
  try {
    await router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      largeSwapAmount,
      0, // minimum amount out
      [soboAddress, testnetWftmAddress],
      deployer.address,
      deadline
    )
    console.error('Test swap of >1% unexpectedly passed')
  } catch (error) {
    console.log('Test swap of >1% correctly failed:', error)
  }
}


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
