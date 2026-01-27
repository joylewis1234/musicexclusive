import { Header } from "@/components/Header";

const TestPayouts = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-lg md:max-w-4xl mx-auto px-4 pt-20 pb-8">
        <h1 className="text-2xl font-display font-bold mb-6">Test Payouts & Reports</h1>
        <p className="text-muted-foreground">
          This page is for testing payouts and reports. Add your test components here.
        </p>
      </main>
    </div>
  );
};

export default TestPayouts;
