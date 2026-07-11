import { type MetaFunction } from "react-router";
import { Layout } from "../components/Layout";

export const meta: MetaFunction = () => {
  return [
    { title: "Terms of Service | Opuszen" },
    {
      name: "description",
      content: "Terms of service for OpusZen.",
    },
  ];
};

export default function TermsRoute() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <h1 className="text-4xl font-bold tracking-tight text-foreground mb-6 text-gradient">
          Terms of Service
        </h1>
        <div className="prose prose-neutral dark:prose-invert max-w-none text-muted-foreground space-y-6">
          <p>Last updated: July 7, 2026</p>
          <p>
            Welcome to OpusZen. By accessing or using our services, you agree to be bound by these
            Terms of Service. If you do not agree, please do not use our services.
          </p>
          <h2 className="text-xl font-semibold text-foreground mt-8">1. Acceptance of Terms</h2>
          <p>
            By using the OpusZen API gateway and dashboard, you agree to comply with and be bound
            by these Terms of Service. These terms apply to all visitors, users, and others who
            access or use the service.
          </p>
          <h2 className="text-xl font-semibold text-foreground mt-8">2. Description of Service</h2>
          <p>
            OpusZen provides Anthropic-compatible API gateway services. You are responsible for
            obtaining access to the service and that access may involve third-party fees.
          </p>
          <h2 className="text-xl font-semibold text-foreground mt-8">3. API Usage and Quotas</h2>
          <p>
            API access is subject to limits, quotas, and expiration based on your assigned keys
            and plans. Any attempt to bypass rate limits or system parameters is a violation of
            these terms.
          </p>
        </div>
      </div>
    </Layout>
  );
}
