import React, { useState, useEffect } from "react";

interface Service {
	id: string;
	name: string;
	description: string;
	price: string;
	owner: string;
	validityDuration: number;
	isActive: boolean;
}

const ServiceDiscovery: React.FC = () => {
	const [services, setServices] = useState<Service[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		fetchServices();
	}, []);

	const fetchServices = async () => {
		try {
			const response = await fetch("http://localhost:3000/api/services");
			if (!response.ok) {
				throw new Error("Failed to fetch services");
			}
			const data = await response.json();
			setServices(data.services || []);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unknown error");
		} finally {
			setLoading(false);
		}
	};

	if (loading) return <div className="loading">Loading services...</div>;
	if (error) return <div className="error">Error: {error}</div>;

	return (
		<div className="service-discovery">
			<h2>Available Services</h2>
			<div className="services-grid">
				{services.map((service) => (
					<div key={service.id} className="service-card">
						<h3>{service.name}</h3>
						<p>{service.description}</p>
						<div className="service-details">
							<span className="price">{service.price} USDRIF</span>
							<span className="duration">
								Valid for {service.validityDuration}s
							</span>
							<span
								className={`status ${service.isActive ? "active" : "inactive"}`}
							>
								{service.isActive ? "Active" : "Inactive"}
							</span>
						</div>
						<button
							className="access-btn"
							onClick={() =>
								(window.location.href = `/protected/${service.id}/resource1`)
							}
						>
							Access Service
						</button>
					</div>
				))}
			</div>
		</div>
	);
};

export default ServiceDiscovery;
