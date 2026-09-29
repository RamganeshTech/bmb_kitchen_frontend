import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './pages/login_pages/LoginPage'
import { BrowserRouter as Router } from 'react-router-dom'
import ForgotPassword from './pages/login_pages/ForgotPassword'
import ResetPassword from './pages/login_pages/ResetPassword'
import { ToastContainer } from './components/ui/toast/ToastContainer'
import { useAuthCheck } from './hooks/useAuthCheck'
import RegisterOrganization from './pages/organization_pages/RegisterOrganization'
import { AppLayout } from './layout/AppLayout'
import { ProtectedRoute } from './components/shared/ProtectedRoute'
import OrganizationSettings from './pages/organization_pages/OrganizationSetting'
import { MANAGEMENT_ONLY } from './constants/constants'
import OutletMain from './pages/outlet_pages/OutletMain'
import MenuCategory from './pages/menu_category_pages/MenuCategoryMain'
import MenuItemMain from './pages/menu_item_pages/MenuItemMain'
import RestaurantTableMain from './pages/restaurantTable_pages/RestaurantTablemain'

const App = () => {

  const { isLoading } = useAuthCheck();

  // Show a clean loading screen while verifying the session
  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-page">
        <div className="flex flex-col items-center gap-4">
          {/* Using a Lucide-react spinner or FontAwesome */}
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted text-sm font-medium tracking-wide">
            Verifying Session...
          </p>
        </div>
      </div>
    );
  }


  return (
    <>
      <Router >
        <Routes>
          <Route path="/" element={<Navigate to={'/login'} replace={true} />} />
          {/* <Route path="/register-organization" element={<RegisterOrganization />} /> */}
          <Route path="/login" element={<LoginPage />} />

          <Route path="/register-organization" element={<RegisterOrganization />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:id/:token" element={<ResetPassword />} />

          <Route path='/layout' element={<AppLayout />}>

            <Route element={<ProtectedRoute allowedRoles={MANAGEMENT_ONLY} />}>
              <Route path="organization" element={<OrganizationSettings />} />
              <Route path="outlet" element={<OutletMain />} />
              <Route path="tables" element={<RestaurantTableMain />} />
              <Route path="menu-item" element={<MenuItemMain />} />
              <Route path="menu-category" element={<MenuCategory />} >
                <Route path="menu-item/:menuCategoryId" element={<MenuItemMain />} />
              </Route>

            </Route>
          </Route>

        </Routes>

        <ToastContainer />
      </Router>
    </>
  )
}

export default App