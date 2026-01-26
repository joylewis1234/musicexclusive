import { Navigate } from "react-router-dom";

// Redirect /artist/login to the main artist auth page
const ArtistLogin = () => {
  return <Navigate to="/auth/artist" replace />;
};

export default ArtistLogin;
