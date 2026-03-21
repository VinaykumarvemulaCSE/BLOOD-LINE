import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  url?: string;
  type?: string;
}

export default function SEO({ 
  title = "BloodLine — Donate Blood. Save Lives.",
  description = "BloodLine connects blood donors, receivers, and hospitals through a real-time platform for emergency blood discovery, donation tracking, and life-saving coordination.",
  keywords = "blood donation, find blood donors, emergency blood, blood bank, donate blood online, blood request, blood compatibility, hospital blood",
  url = "https://bloodline.app",
  type = "website"
}: SEOProps) {
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      
      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      
      {/* Twitter */}
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
    </Helmet>
  );
}
