import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import abi from "./utils/WavePortal.json"
import './App.css';

const getEthereumObject = () => window.ethereum;

export default function App() {
  const [currentAccount, setCurrentAccount] = useState("");
  const [currentWaves, setCurrentWaves] = useState(0);
  const [allWaves, setAllWaves] = useState([]);

  const contractAddress = "0x040d53AD305d49F011A1Fe6009a5ff529403Dfa6";
  
  // ABI is a file generated when we compiled our smart contract
  const contractABI = abi.abi;

  const findLinkedMetaMaskAccount = async () => {
    try {
      const ethereum = getEthereumObject();
      if (!ethereum) {
        console.log("Make sure you have the Metamask browser extension installed!");
        return null;
      }
      console.log("The ethereum object is: ", ethereum);
      const accounts = await ethereum.request({ method: "eth_accounts" });
  
      if (accounts.length !== 0) {
        const account = accounts[0];
        console.log("Found a linked account: ", account);
        getAllWaves();
        return account;
      } else {
        console.log("No authorized acccount found!");
        return null;
      }
    } catch (error) {
      console.log(error);
      return null;
    }
  };

  const connectWallet = async () => {
    try {
      const ethereum = getEthereumObject();
      if (!ethereum) {
        alert("Please install the MetaMask browser extension!");
        return;
      }

      // Ask MetaMask to grant access to the user's wallet
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });

      console.log("Connected: ", accounts[0]);
      setCurrentAccount(accounts[0]);

    } catch (error) {
      console.log(error);
    }
  };

  const wave = async () => {
    try {
      const ethereum = getEthereumObject();
  
      if (!ethereum) {
        console.log("No ethereum object found");
      }

      const provider = new ethers.providers.Web3Provider(ethereum);
      const signer = provider.getSigner();

      // Now, we use wavePortalContract to call all of the methods we defined in WavePortal.sol
      const wavePortalContract = new ethers.Contract(contractAddress, contractABI, signer);
  
      // Read the number of waves
      let waveCount = await wavePortalContract.getTotalWaves();
      console.log(`You have been waved at ${waveCount} times!`);

      let waveMsg = document.getElementById("wave_msg").value;
      console.log(waveMsg);
      // Write to the contract, updating the number of waves
      const waveTxn = await wavePortalContract.wave(waveMsg, { gasLimit: 300000 });
      console.log("Mining... ", waveTxn.hash);

      await waveTxn.wait();
      console.log("Mined: ", waveTxn.hash);
        
      waveCount = await wavePortalContract.getTotalWaves();
      console.log(`You have been waved at ${waveCount} times!`);

      setCurrentWaves(waveCount.toNumber());
    } catch (error) {
      console.log(error);
    }
  };

  // Method that retrieves all waves from our contract upon first loading the page with an authorized account
  const getAllWaves = async () => {
    try {
      const ethereum = getEthereumObject();

      if (!ethereum) {
        console.log("No ethereum object found");
      }

      const provider = new ethers.providers.Web3Provider(ethereum);
      const signer = provider.getSigner();
      const wavePortalContract = new ethers.Contract(contractAddress, contractABI, signer);

      const waves = await wavePortalContract.getAllWaves();

      let cleanedWaves = waves.map((wave) => {
        return {
          address: wave.waver,
          timestamp: new Date(wave.timestamp * 1000),
          message: wave.message
        }
      });

      console.log(cleanedWaves)
      setAllWaves(cleanedWaves);
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(async () => {
    const account = await findLinkedMetaMaskAccount();
    if (account !== null) {
      setCurrentAccount(account);
    }
  }, []);

  // Refresh the page whenever we wave
  useEffect(() => {
    let wavePortalContract;

    // A function to trigger whenever the NewWave event is emitted (which happens when the wave function in our contract is called)
    const onNewWave = (from, timestamp, message) => {
      console.log("NewWave", from, timestamp, message);
      setAllWaves((prevState) => [
        ...prevState,
        {address: from,
        timestamp: new Date(timestamp * 1000),
        message: message
      }
    ]);
    };

    if (window.ethereum) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      wavePortalContract = new ethers.Contract(contractAddress, contractABI, signer);
      wavePortalContract.on("NewWave", onNewWave);
    }

    return () => {
      if (wavePortalContract) {
        wavePortalContract.off("NewWave", onNewWave);
      }
    };
  }, []);

  return (
    <div className="mainContainer">

      <div className="dataContainer">
        <div className="header">
          <span role="img" aria-label="welcome message">Welcome! 🌊</span>
        </div>

        <div className="bio">
          <span role="img" aria-label="initial">Hiya! I'm Joshua! Connect your Metamask wallet and "wave" at me! 😆</span>
        </div>

        <button className="waveButton" onClick={wave}>
          "Wave" at Me
        </button>

        {!currentAccount && (
          <button className="waveButton" onClick={connectWallet}>
            Connect Wallet
          </button>
        )}

        {currentAccount && (
          <input id="wave_msg" type="text" placeholder="Send a message"></input>
        )}

        <div className="bio">
          You have been waved at {currentWaves} times!
        </div>

        <div className="header2">
          Messages
        </div>
        {allWaves.map((wave, index) => {
          return (
            <div key={index} style={{ backgroundColor: "OldLace", marginTop: "16px", padding: "8px" }}>
              <div>Address: {wave.address}</div>
              <div>Timestamp: {wave.timestamp.toString()}</div>
              <div>Message: {wave.message}</div>
            </div>
          )
        })}
      </div>
    </div>
  );
};
