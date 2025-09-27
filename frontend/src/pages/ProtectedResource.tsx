import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

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

const ProtectedResource: React.FC = () => {
	const { serviceId, resourceId } = useParams<{
		serviceId: string;
		resourceId: string;
	}>();
	const [paymentRequired, setPaymentRequired] =
		useState<PaymentRequired | null>(null);
	const [loading, setLoading] = useState(true);
	const [accessGranted, setAccessGranted] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		checkAccess();
	}, [serviceId, resourceId]);

	const checkAccess = async () => {
		if (!serviceId || !resourceId) return;

		try {
			const response = await fetch(
				`http://localhost:3000/api/x402/protected/${serviceId}/${resourceId}`,
			);

			if (response.status === 402) {
				// Payment required
				const data = await response.json();
				setPaymentRequired(data);
				setAccessGranted(false);
			} else if (response.status === 200) {
				// Access granted
				setAccessGranted(true);
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
		if (!paymentRequired) return;

		// This would integrate with web3 wallet to make the payment
		// For now, we'll simulate it
		alert(
			`Would initiate payment of ${paymentRequired.payment.price} ${paymentRequired.payment.currency} to contract ${paymentRequired.payment.contractAddresses.paymentGateway}`,
		);

		// After payment, recheck access
		setTimeout(() => {
			checkAccess();
		}, 2000);
	};

	if (loading) return <div className="loading">Checking access...</div>;
	if (error) return <div className="error">Error: {error}</div>;

	if (accessGranted) {
		return (
			<div className="protected-resource">
				<h2>🎉 Access Granted!</h2>
				<p>You have successfully accessed the protected resource.</p>
				<div className="resource-content">
					<h3>Service: {serviceId}</h3>
					<h4>Resource: {resourceId}</h4>
					<div className="content-placeholder">
						<p>This is the protected content you paid to access.</p>
						<p>Your subscription is valid and you can use this service.</p>
					</div>
				</div>
			</div>
		);
	}

	if (paymentRequired) {
		return (
			<div className="protected-resource">
				<h2>🔒 Payment Required (HTTP 402)</h2>
				<div className="payment-details">
					<h3>{paymentRequired.payment.serviceName}</h3>
					<p>{paymentRequired.payment.description}</p>

					<div className="payment-info">
						<div className="info-item">
							<label>Price:</label>
							<span>
								{paymentRequired.payment.price}{" "}
								{paymentRequired.payment.currency}
							</span>
						</div>
						<div className="info-item">
							<label>Network:</label>
							<span>{paymentRequired.payment.network}</span>
						</div>
						<div className="info-item">
							<label>Validity:</label>
							<span>{paymentRequired.payment.validityDuration} seconds</span>
						</div>
					</div>

					<div className="contract-info">
						<h4>Contract Addresses:</h4>
						<div className="contract-item">
							<label>Payment Gateway:</label>
							<code>
								{paymentRequired.payment.contractAddresses.paymentGateway}
							</code>
						</div>
						<div className="contract-item">
							<label>USDRIF Token:</label>
							<code>
								{paymentRequired.payment.contractAddresses.usdrifToken}
							</code>
						</div>
					</div>

					<button className="payment-btn" onClick={makePayment}>
						Pay {paymentRequired.payment.price}{" "}
						{paymentRequired.payment.currency}
					</button>

					<p className="payment-note">
						Connect your wallet and approve the transaction to access this
						resource.
					</p>
				</div>
			</div>
		);
	}

	return <div>Unexpected state</div>;
};

export default ProtectedResource;
