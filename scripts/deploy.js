const hre = require("hardhat");

const testnetRouterAddress = "0xa6AD18C2aC47803E193F75c3677b14BF19B94883";
const testnetFactoryAddress = "0xEE4bC42157cf65291Ba2FE839AE127e3Cc76f741";
let deployer;
let deployerAddress;
let testnetWftmAddress = "0xf1277d1Ed8AD466beddF92ef448A132661956621";
let soboAddress = "0x0000000000000000000000000000000000000000";
let totalSupply = 0;
let liquiditySoboAmount = 0;
let wftmAmount = 0;
let wftm;
let sobo;
let router;
let factory;

const wait = 5;

const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from the current Unix time
const testnet = true;

async function getRouterAndFactory() {
  router = await hre.ethers.getContractAt(
    "IUniswapV2Router",
    testnetRouterAddress
  );
  const factoryAddress = await router.factory();
  factory = await hre.ethers.getContractAt("IUniswapV2Factory", factoryAddress);
}

async function deployMockWFTM() {
  wftm = await hre.ethers.deployContract("MockWFTM", []);
  const wftmDeployed = await wftm.deploymentTransaction().wait();
  testnetWftmAddress = wftmDeployed.contractAddress;
  console.log("WFTM deployed to:", testnetWftmAddress);
}

async function deploySoboToken(wait = 5) {
  sobo = await hre.ethers.deployContract("SoboToken", [
    testnetFactoryAddress,
    testnetRouterAddress,
    testnetWftmAddress,
  ]);
  const soboDeployed = await sobo.deploymentTransaction().wait(wait);
  soboAddress = soboDeployed.contractAddress;
  console.log("SOBO deployed to:", soboAddress);
  const soboWftmAddress = await sobo.wftmTokenAddress();
  const soboFactoryAddress = await sobo.uniswapFactory();
  const soboRouterAddress = await sobo.uniswapRouter();
  console.log(`soboWftmAddress: ${soboWftmAddress}`);
  console.log(`factory: ${soboFactoryAddress === testnetFactoryAddress}`);
  console.log(`router: ${soboRouterAddress === testnetRouterAddress}`);
  console.log(`wftm: ${soboWftmAddress === testnetWftmAddress}`);
}

async function verifyContract() {
  await hre.run(`verify:verify`, {
    address: soboAddress,
    constructorArguments: [
      testnetFactoryAddress,
      testnetRouterAddress,
      testnetWftmAddress,
    ],
  });
}

async function approveTokens(deployer) {
  // Approve router to spend tokens
  totalSupply = await sobo.totalSupply();
  liquiditySoboAmount = (totalSupply * BigInt(85)) / BigInt(100); // 85% of total supply // 85% of total supply
  wftmAmount = hre.ethers.parseUnits("100000", "ether"); // 100,000 wFTM

  console.log(`Liquidity SOBO: ${liquiditySoboAmount}`);
  console.log(`Liquidity SOBO: ${wftmAmount}`);

  const soboApproved = await sobo.approve(
    testnetRouterAddress,
    liquiditySoboAmount
  );
  await soboApproved.wait();
  const wftmApproved = await wftm.approve(testnetRouterAddress, wftmAmount);
  await wftmApproved.wait();

  const wftmAllowance = await wftm.allowance(
    deployerAddress,
    testnetRouterAddress
  );
  const soboAllowance = await sobo.allowance(
    deployerAddress,
    testnetRouterAddress
  );

  const soboBalance = await sobo.balanceOf(deployerAddress);
  const wftmBalance = await wftm.balanceOf(deployerAddress);

  console.log(`Deployer SOBO Balance: ${soboBalance}`);
  console.log(`Deployer WFTM Balance: ${wftmBalance}`);

  console.log(`Check router Allowance WFTM: ${wftmAllowance}`);
  console.log(`Check router Allowance SOBO: ${soboAllowance}`);
  console.log(
    `Router Approved: ${testnetRouterAddress} : ${
      soboAllowance == liquiditySoboAmount && wftmAllowance == wftmAmount
    }`
  );
}

async function addLiquidity() {
  // Add Liquidity
  const liquidityAdded = await router.addLiquidity(
    soboAddress,
    testnetWftmAddress,
    liquiditySoboAmount,
    wftmAmount,
    0, // min liquidity tokens
    0, // min wFTM
    deployerAddress,
    deadline
  );
  await liquidityAdded.wait();
  console.log("Liquidity added to Uniswap V2");
}

async function setLiquidityAdded() {
  // mark liquidity added
  const setLiquidityAdded = await sobo.setLiquidityAdded(true);
  await setLiquidityAdded.wait();
  console.log(`LiquidityAdded flag set: ${await sobo.liquidityAdded()}`);
}

async function renounceOwnership() {
  // Renounce Ownership
  const renounceOwnership = await sobo.renounceOwnership();
  await renounceOwnership.wait();
  console.log("Ownership renounced");
}

async function checkReserves() {
  const pairAddress = await factory.getPair(soboAddress, testnetWftmAddress);

  if (pairAddress === "0x0000000000000000000000000000000000000000") {
    console.log("No pair address found.");
    return;
  }

  const pair = await hre.ethers.getContractAt("IUniswapV2Pair", pairAddress);
  const reserves = await pair.getReserves();
  const [reserve0, reserve1] = reserves;
  const token0 = await pair.token0();
  const token1 = await pair.token1();

  // Determine which reserve corresponds to the SOBO token
  let soboReserve;
  if (token0.toLowerCase() === soboAddress.toLowerCase()) {
    soboReserve = reserve0;
  } else if (token1.toLowerCase() === soboAddress.toLowerCase()) {
    soboReserve = reserve1;
  } else {
    console.log("SOBO token is not part of the pair.");
    return;
  }

  console.log(
    `Reserves for SOBO-WFTM pair: Reserve0: ${reserve0.toString()}, Reserve1: ${reserve1.toString()}`
  );
  console.log(`SOBO Reserve: ${soboReserve.toString()}`);

  return soboReserve;
}

async function testSwap(swapAmount) {
  console.log(`Swap Amount: ${swapAmount}`);
  console.log(`Deadline: ${deadline}`);

  try {
    const swapResult =
      await router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
        swapAmount,
        0, // minimum amount out
        [soboAddress, testnetWftmAddress],
        deployerAddress,
        deadline
      );
    await swapResult.wait();
    return true;
  } catch (error) {
    if (error.transaction) {
      console.log(`Error: ${JSON.stringify(error.transaction)}`);
      try {
        const txReceipt = await hre.ethers.provider.getTransactionReceipt(
          error.transaction.hash
        );
        const code = await hre.ethers.provider.call(
          error.transaction,
          txReceipt.blockNumber
        );
        console.error(
          hre.ethers.utils.toUtf8String("0x" + code.substring(138))
        );
      } catch (innerError) {
        console.error("Error in decoding revert reason: ", innerError);
      }
    } else {
      console.error("Transaction failed", error.message);
    }
    return false;
  }
}

async function main() {
  [deployer] = await hre.ethers.getSigners();
  deployerAddress = deployer.address;

  await getRouterAndFactory();

  if (testnet) {
    await deployMockWFTM();
  }

  await deploySoboToken(wait);
  await verifyContract();

  await approveTokens(deployer);

  await addLiquidity();

  await setLiquidityAdded();

  await renounceOwnership();

  // Test limits are in effect.. 
  if (testnet) {
    await approveTokens(deployer);

    let soboReserves = await checkReserves();

    // TestSwap of < 1% of the SOBO reserve - Should Pass
    const swapAmount = (soboReserves * BigInt(5)) / BigInt(1000); // 0.5% of Sobo reserves
    const swapResultPass = (await testSwap(swapAmount))
      ? "\n***[SUCCESS] Test swap of <1% passed***\n"
      : "\n***[FAIL] Test swap of <1% failed***\n";
    console.log(swapResultPass);

    await approveTokens(deployer);

    // TestSwap of > 1% of the SOBO reserve - Should Fail
    soboReserves = await checkReserves();
    const largeSwapAmount = (soboReserves * BigInt(2)) / BigInt(100); // 2% of Sobo reserves
    console.log(`Large Swap Amount: ${largeSwapAmount}`);
    const swapResultFail = (await testSwap(largeSwapAmount))
      ? "\n***[FAIL] Test swap of >1% unexpectedly passed***\n"
      : "\n***[SUCCESS] Test swap of >1% failed correctly***\n";
    console.log(swapResultFail);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
