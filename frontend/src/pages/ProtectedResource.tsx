import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAccount } from 'wagmi';
import { Hash } from 'viem';
import { useX402ClientTestnet, PaymentParams } from '@prix0007/x402-payments-sdk';
import { formatPrice } from '../utils/utils';

interface PaymentRequired {
	error: string;
	code: number;
	message: string;
	payment: {
		serviceId: string;
		resourceId: string;
		serviceName: string;
		price: string;
		currency: string;
		network: string;
		validityDuration: number;
		description: string;
		contractAddresses: {
			paymentGateway: string;
			usdrifToken: string;
		};
	};
}

interface AccessGrantedData {
	success: boolean;
	data: {
		message: string;
		resourceId: string;
		serviceId: string;
		userAddress: string;
		accessExpiresAt: number;
		content: {
			title: string;
			data: string;
			timestamp: string;
			serviceInfo: {
				name: string;
				description: string;
			};
		};
	};
}

const ProtectedResource: React.FC = () => {
	const { serviceId, resourceId } = useParams<{
		serviceId: string;
		resourceId: string;
	}>();
	const { address: userAddress, isConnected } = useAccount();
	const client = useX402ClientTestnet();
	const [paymentRequired, setPaymentRequired] = useState<PaymentRequired | null>(null);
	const [accessGrantedData, setAccessGrantedData] = useState<AccessGrantedData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isPaying, setIsPaying] = useState(false);
	const [paymentHash, setPaymentHash] = useState<Hash | null>(null);
	const [paymentError, setPaymentError] = useState<string | null>(null);
	const [approvalStatus, setApprovalStatus] = useState<'checking' | 'approving' | 'sufficient' | null>(null);

	useEffect(() => {
		checkAccess();
	}, [serviceId, resourceId]);

	const checkAccess = async () => {
		if (!serviceId || !resourceId) return;

		try {
			const headers: Record<string, string> = {};

			// Add user address header if wallet is connected
			if (userAddress) {
				headers['x-user-address'] = userAddress;
			}

			const response = await fetch(
				`http://localhost:3000/api/x402/protected/${serviceId}/${resourceId}`,
				{ headers }
			);

			if (response.status === 402) {
				// Payment required
				const data = await response.json();
				setPaymentRequired(data);
				setAccessGrantedData(null);
			} else if (response.status === 200) {
				// Access granted
				const data = await response.json();
				setAccessGrantedData(data);
				setPaymentRequired(null);
			} else {
				throw new Error("Unexpected response");
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unknown error");
		} finally {
			setLoading(false);
		}
	};

	const makePayment = async () => {
		if (!paymentRequired || !userAddress || !client) {
			setPaymentError('Please connect your wallet first');
			return;
		}

		try {
			setIsPaying(true);
			setPaymentError(null);
			setPaymentHash(null);
			setApprovalStatus('checking');

			// Get service details for price checking
			const service = await client.getService(paymentRequired.payment.serviceId);
			const servicePrice = client.parseUSDRIF(paymentRequired.payment.price);

			// Check current allowance
			const currentAllowance = await client.getAllowance();

			if (currentAllowance.gte(servicePrice)) {
				setApprovalStatus('sufficient');
				console.log('Sufficient allowance already exists, skipping approval');
			} else {
				setApprovalStatus('approving');
				console.log('Insufficient allowance, approval will be required');
			}

			// Generate resource ID for this payment
			const resourceId = client.generateResourceId(
				`${paymentRequired.payment.serviceId}/${paymentRequired.payment.resourceId}`,
				userAddress
			);

			// Prepare payment parameters
			const paymentParams: PaymentParams = {
				serviceId: paymentRequired.payment.serviceId,
				resourceId: resourceId
			};

			// Subscribe to service using SDK (handles approval and payment automatically)
			const paymentResult = await client.subscribeToService(paymentParams);

			setPaymentHash(paymentResult.transactionHash as Hash);
			console.log('Payment successful:', paymentResult);

			// Wait a moment for blockchain confirmation, then recheck access
			setTimeout(() => {
				checkAccess();
			}, 3000);

		} catch (error) {
			console.error('Payment failed:', error);
			setPaymentError(error instanceof Error ? error.message : 'Payment failed');
		} finally {
			setIsPaying(false);
			setApprovalStatus(null);
		}
	};

	// Loading state
	if (loading) {
		return (
			<div className="container mx-auto px-4 py-8">
				<div className="flex justify-center items-center min-h-[400px]">
					<div className="flex flex-col items-center gap-4">
						<div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
						<div className="text-gray-600">Checking access...</div>
					</div>
				</div>
			</div>
		);
	}

	// Error state
	if (error) {
		return (
			<div className="container mx-auto px-4 py-8">
				<div className="max-w-md mx-auto">
					<div className="bg-red-50 border border-red-200 rounded-lg p-6">
						<div className="text-red-800 text-lg font-medium mb-2">Error</div>
						<p className="text-red-700">{error}</p>
						<button
							onClick={() => window.location.reload()}
							className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
						>
							Retry
						</button>
					</div>
				</div>
			</div>
		);
	}

	// Wallet not connected
	if (!isConnected) {
		return (
			<div className="container mx-auto px-4 py-8">
				<div className="max-w-md mx-auto">
					<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
						<div className="text-yellow-800 text-lg font-medium mb-2">Wallet Not Connected</div>
						<p className="text-yellow-700 mb-4">Please connect your wallet to access this protected resource.</p>
						<button
							onClick={() => window.location.href = '/'}
							className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
						>
							Go Back
						</button>
					</div>
				</div>
			</div>
		);
	}

	// Access granted
	if (accessGrantedData) {
		return (
			<div className="container mx-auto px-4 py-8">
				<div className="max-w-4xl mx-auto">
					<div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
						<div className="flex items-center gap-3 mb-4">
							<div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
								<svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
							</div>
							<div>
								<h1 className="text-2xl font-bold text-green-900">🎉 Access Granted!</h1>
								<p className="text-green-700">You have successfully accessed the protected resource.</p>
							</div>
						</div>
					</div>

					<div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
						<div className="mb-6">
							<h2 className="text-xl font-semibold text-gray-900 mb-2">
								{accessGrantedData.data.content.serviceInfo.name}
							</h2>
							<p className="text-gray-600">{accessGrantedData.data.content.serviceInfo.description}</p>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
							<div className="space-y-3">
								<div>
									<span className="text-sm font-medium text-gray-500">Service ID:</span>
									<div className="bg-gray-50 p-2 rounded border mt-1">
										<code className="text-xs font-mono text-gray-800 break-all">{accessGrantedData.data.serviceId}</code>
									</div>
								</div>
								<div>
									<span className="text-sm font-medium text-gray-500">Resource ID:</span>
									<div className="bg-gray-50 p-2 rounded border mt-1">
										<code className="text-xs font-mono text-gray-800 break-all">{accessGrantedData.data.resourceId}</code>
									</div>
								</div>
							</div>
							<div className="space-y-3">
								<div>
									<span className="text-sm font-medium text-gray-500">Your Address:</span>
									<div className="bg-gray-50 p-2 rounded border mt-1">
										<code className="text-xs font-mono text-gray-800">{accessGrantedData.data.userAddress}</code>
									</div>
								</div>
								<div>
									<span className="text-sm font-medium text-gray-500">Access Expires:</span>
									<div className="text-sm text-gray-800 mt-1">
										{new Date(accessGrantedData.data.accessExpiresAt * 1000).toLocaleString()}
									</div>
								</div>
							</div>
						</div>

						<div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
							<h3 className="text-lg font-semibold text-blue-900 mb-3">{accessGrantedData.data.content.title}</h3>
							<p className="text-blue-800 mb-4">{accessGrantedData.data.content.data}</p>
							<div className="text-sm text-blue-600">
								Generated: {new Date(accessGrantedData.data.content.timestamp).toLocaleString()}
							</div>
						</div>

						<div className="mt-6 flex gap-3">
							<button
								onClick={() => window.location.href = '/dashboard'}
								className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
							>
								View Dashboard
							</button>
							<button
								onClick={() => window.location.href = '/'}
								className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
							>
								Discover More Services
							</button>
						</div>
					</div>
				</div>
			</div>
		);
	}

	// Payment required
	if (paymentRequired) {
		return (
			<div className="container mx-auto px-4 py-8">
				<div className="max-w-2xl mx-auto">
					<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
						<div className="flex items-center gap-3 mb-4">
							<div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
								<svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
								</svg>
							</div>
							<div>
								<h1 className="text-2xl font-bold text-yellow-900">🔒 Payment Required</h1>
								<p className="text-yellow-700">HTTP 402 - This resource requires payment to access</p>
							</div>
						</div>
					</div>

					<div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
						<div className="mb-6">
							<h2 className="text-xl font-semibold text-gray-900 mb-2">
								{paymentRequired.payment.serviceName}
							</h2>
							<p className="text-gray-600">{paymentRequired.payment.description}</p>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
							<div className="space-y-3">
								<div className="flex justify-between items-center">
									<span className="text-sm font-medium text-gray-500">Price:</span>
									<div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
										{formatPrice(paymentRequired.payment.price)}
									</div>
								</div>
								<div className="flex justify-between items-center">
									<span className="text-sm font-medium text-gray-500">Network:</span>
									<div className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium capitalize">
										{paymentRequired.payment.network}
									</div>
								</div>
								<div className="flex justify-between items-center">
									<span className="text-sm font-medium text-gray-500">Validity:</span>
									<div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
										{Math.floor(paymentRequired.payment.validityDuration / 3600)}h
									</div>
								</div>
							</div>
							<div className="space-y-3">
								<div>
									<span className="text-sm font-medium text-gray-500">Service ID:</span>
									<div className="bg-gray-50 p-2 rounded border mt-1">
										<code className="text-xs font-mono text-gray-800 break-all">{paymentRequired.payment.serviceId}</code>
									</div>
								</div>
								<div>
									<span className="text-sm font-medium text-gray-500">Resource:</span>
									<div className="bg-gray-50 p-2 rounded border mt-1">
										<code className="text-xs font-mono text-gray-800">{paymentRequired.payment.resourceId}</code>
									</div>
								</div>
							</div>
						</div>

						<div className="space-y-2 mb-6">
							<button
								onClick={makePayment}
								disabled={isPaying || !userAddress}
								className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
									isPaying || !userAddress
										? 'bg-gray-400 text-gray-600 cursor-not-allowed'
										: 'bg-blue-600 hover:bg-blue-700 text-white'
								}`}
							>
								{isPaying ? (
									<div className="flex items-center justify-center gap-2">
										<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
										{approvalStatus === 'checking' ? 'Checking Allowance...' :
										 approvalStatus === 'approving' ? 'Approving Tokens...' :
										 approvalStatus === 'sufficient' ? 'Processing Payment...' :
										 'Processing...'}
									</div>
								) : !userAddress ? (
									'Connect Wallet to Pay'
								) : (
									`Pay ${formatPrice(paymentRequired.payment.price)}`
								)}
							</button>

							<button
								onClick={() => window.location.href = '/'}
								className="w-full py-2 px-4 rounded-lg font-medium transition-colors bg-gray-600 hover:bg-gray-700 text-white"
							>
								Back to Services
							</button>
						</div>

						{/* Payment Status Messages */}
						{approvalStatus === 'sufficient' && isPaying && (
							<div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded text-blue-700 text-sm">
								<div className="flex items-center gap-2">
									<div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
									Sufficient allowance found, skipping approval step
								</div>
							</div>
						)}

						{approvalStatus === 'approving' && isPaying && (
							<div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-700 text-sm">
								<div className="flex items-center gap-2">
									<div className="w-3 h-3 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
									Token approval required - please confirm in your wallet
								</div>
							</div>
						)}

						{paymentError && (
							<div className="mb-3 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
								{paymentError}
							</div>
						)}

						{paymentHash && (
							<div className="mb-3 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
								<div className="font-medium">Payment Successful!</div>
								<a
									href={`https://explorer.testnet.rsk.co/tx/${paymentHash}`}
									target="_blank"
									rel="noopener noreferrer"
									className="text-green-600 hover:text-green-800 underline text-xs"
								>
									View Transaction
								</a>
								<div className="text-xs mt-1">Checking access in a moment...</div>
							</div>
						)}

						{/* Contract Info */}
						<details className="group">
							<summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-900 mb-2">
								Contract Information
							</summary>
							<div className="space-y-2 pl-4 border-l-2 border-gray-200">
								<div>
									<span className="text-xs font-medium text-gray-500">Payment Gateway:</span>
									<div className="bg-gray-50 p-2 rounded border mt-1">
										<code className="text-xs font-mono text-gray-800 break-all">
											{paymentRequired.payment.contractAddresses.paymentGateway}
										</code>
									</div>
								</div>
								<div>
									<span className="text-xs font-medium text-gray-500">USDRIF Token:</span>
									<div className="bg-gray-50 p-2 rounded border mt-1">
										<code className="text-xs font-mono text-gray-800 break-all">
											{paymentRequired.payment.contractAddresses.usdrifToken}
										</code>
									</div>
								</div>
							</div>
						</details>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto px-4 py-8">
			<div className="text-center py-12">
				<div className="text-gray-500 text-lg">Unexpected state</div>
				<button
					onClick={() => window.location.href = '/'}
					className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
				>
					Go Home
				</button>
			</div>
		</div>
	);
};

export default ProtectedResource;
