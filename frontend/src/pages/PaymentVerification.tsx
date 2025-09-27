import React, { useState } from "react";

interface PaymentInfo {
	paymentId: string;
	serviceId: string;
	subscriber: string;
	amount: string;
	timestamp: string;
	isValid: boolean;
	expirationTime: string;
}

const PaymentVerification: React.FC = () => {
	const [paymentId, setPaymentId] = useState("");
	const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const verifyPayment = async () => {
		if (!paymentId.trim()) {
			setError("Please enter a payment ID");
			return;
		}

		setLoading(true);
		setError(null);

		try {
			const response = await fetch(
				`http://localhost:3000/api/payments/verify/${paymentId}`,
			);
			if (!response.ok) {
				throw new Error("Payment not found or invalid");
			}
			const data = await response.json();
			setPaymentInfo(data);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unknown error");
			setPaymentInfo(null);
		} finally {
			setLoading(false);
		}
	};

	const getPaymentProof = async () => {
		if (!paymentId.trim()) {
			setError("Please enter a payment ID");
			return;
		}

		try {
			const response = await fetch(
				`http://localhost:3000/api/payments/proof/${paymentId}`,
			);
			if (!response.ok) {
				throw new Error("Proof not found");
			}
			const data = await response.json();

			// Download proof as JSON file
			const blob = new Blob([JSON.stringify(data, null, 2)], {
				type: "application/json",
			});
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `payment-proof-${paymentId}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to get proof");
		}
	};

	return (
		<div className="payment-verification">
			<h2>Payment Verification</h2>

			<div className="verification-form">
				<div className="input-group">
					<label htmlFor="paymentId">Payment ID:</label>
					<input
						id="paymentId"
						type="text"
						value={paymentId}
						onChange={(e) => setPaymentId(e.target.value)}
						placeholder="Enter payment transaction ID"
					/>
				</div>

				<div className="button-group">
					<button onClick={verifyPayment} disabled={loading}>
						{loading ? "Verifying..." : "Verify Payment"}
					</button>
					<button onClick={getPaymentProof} disabled={loading || !paymentId}>
						Get Proof
					</button>
				</div>
			</div>

			{error && <div className="error">{error}</div>}

			{paymentInfo && (
				<div className="payment-info">
					<h3>Payment Details</h3>
					<div className="info-grid">
						<div className="info-item">
							<label>Payment ID:</label>
							<span>{paymentInfo.paymentId}</span>
						</div>
						<div className="info-item">
							<label>Service ID:</label>
							<span>{paymentInfo.serviceId}</span>
						</div>
						<div className="info-item">
							<label>Subscriber:</label>
							<span>{paymentInfo.subscriber}</span>
						</div>
						<div className="info-item">
							<label>Amount:</label>
							<span>{paymentInfo.amount} USDRIF</span>
						</div>
						<div className="info-item">
							<label>Timestamp:</label>
							<span>{new Date(paymentInfo.timestamp).toLocaleString()}</span>
						</div>
						<div className="info-item">
							<label>Status:</label>
							<span className={paymentInfo.isValid ? "valid" : "invalid"}>
								{paymentInfo.isValid ? "Valid" : "Invalid"}
							</span>
						</div>
						<div className="info-item">
							<label>Expires:</label>
							<span>
								{new Date(paymentInfo.expirationTime).toLocaleString()}
							</span>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default PaymentVerification;
