import { ethers } from 'ethers';

const provider = new ethers.providers.JsonRpcProvider();

const signer = provider.getSigner();
