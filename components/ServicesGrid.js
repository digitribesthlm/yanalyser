export default function ServicesGrid() {
  const services = [
    {
      title: "Performance Marketing",
      description: "Strategic PPC campaigns across Google, Meta, LinkedIn, and more. Drive targeted traffic that converts."
    },
    {
      title: "Search Engine Optimization",
      description: "Dominate search rankings with data-driven SEO strategies tailored to your market and audience."
    },
    {
      title: "Journey Optimization",
      description: "Enhance every touchpoint of your customer journey with advanced analytics and optimization."
    },
    {
      title: "International Growth",
      description: "Expand your reach across 10 European markets with localized digital strategies."
    },
    {
      title: "Data & Analytics",
      description: "Turn data into insights with comprehensive tracking and performance measurement."
    },
    {
      title: "Strategy & Innovation",
      description: "Custom digital strategies that align with your business goals and market dynamics."
    }
  ];

  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-8">
        <h2 className="text-4xl font-bold text-center mb-16">Full-Service Digital Growth</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div 
              key={index} 
              className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col items-center text-center">
                <h3 className="text-xl font-semibold mb-3">{service.title}</h3>
                <p className="text-gray-600">{service.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
} 