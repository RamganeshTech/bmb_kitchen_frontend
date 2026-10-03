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
import InventoryMain from './pages/inventory_pages/InventoryMain'
import VendorMain from './pages/vendor_pages/VendorMain'
import WasteAdjustmentMain from './pages/wasteAdjustment_pages/WasteAdjustmentMain'
import CustomerMain from './pages/customer_pages/CustomerMain'
import OfferMain from './pages/offer_pages/OfferMain'
import LoyaltyProgramMain from './pages/loyalty_program_pages/LoyaltyProgramMain'
import RecipeCostMain from './pages/recipeCost_pages/RecipeCostMain'
import PurchaseMain from './pages/purchase_pages/PurchaseMain'
import CentralKitchenMain from './pages/centralKitchen_pages/CentralKitchenMain'
import SupportTicketMain from './pages/supportTicket_pages/SupportTicketMain'
import TaxSettingsMain from './pages/Taxsetting_pages/TaxSettingMain'
import PrinterSettingsMain from './pages/printer_pages/PrinterMain'
import SubscriptionMain from './pages/subscription_pages/Subscription'

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
              <Route path="inventory" element={<InventoryMain />} />
              <Route path="vendor" element={<VendorMain />} />
              <Route path="customer" element={<CustomerMain />} />
              <Route path="offer" element={<OfferMain />} />
              <Route path="loyalty-program" element={<LoyaltyProgramMain />} />
              <Route path="waste-adjustment" element={<WasteAdjustmentMain />} />
              <Route path="recipe-cost-management" element={<RecipeCostMain />} />
              <Route path="purchase" element={<PurchaseMain />} />
              <Route path="central-kitchen" element={<CentralKitchenMain />} />
              <Route path="support-ticket" element={<SupportTicketMain />} />
              <Route path="taxsetting" element={<TaxSettingsMain />} />
              <Route path="printer" element={<PrinterSettingsMain />} />
              <Route path="subscription" element={<SubscriptionMain />} />
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