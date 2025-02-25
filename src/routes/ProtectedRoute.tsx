import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthProvider"

const ProtectedRoute = () => {
    const { user, loading } = useAuth();
    if (loading) {
        return <p>Loading ...</p>
    }
    if (!user) {
        return <Navigate to='/login' />
    }

    return <Outlet />
}

export default ProtectedRoute;