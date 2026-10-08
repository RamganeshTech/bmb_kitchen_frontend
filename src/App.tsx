import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './pages/login_pages/LoginPage'
import { BrowserRouter as Router } from 'react-router-dom'
import { useAuthCheck } from './hooks/useAuthCheck'
import { MANAGEMENT_ONLY } from './constants/constants'
import { AppLayout } from './layout/AppLayout'
import { ProtectedRoute } from './components/shared/ProtectedRoute'
import { ToastContainer } from './components/ui/toast/ToastContainer'
import { lazy } from 'react'
import PaymentMain from './pages/payment_pages/PaymentMain'
import NotificationSettingMain from './pages/notificationSetting_pages/notificationSettingMain'
import NotificationMain from './pages/notification_pages/NotificationMain'
import UserProfile from './pages/userprofile_pages/UserProfile'
import OrderMain from './pages/order_pages/OrderMain'
import KitchenMain from './pages/kitchen_pages/Kitchenmain'
import RoleMain from './pages/role_pages/RoleMain'
import UserMain from './pages/user_pages/UserMain'
import UserSingle from './pages/user_pages/UserSingle'
import MyOrdersMain from './pages/order_pages/MyOrdersMain'
const ResetPassword = lazy(() => import('./pages/login_pages/ResetPassword'))
const ForgotPassword = lazy(() => import('./pages/login_pages/ForgotPassword'))
const RegisterOrganization = lazy(() => import('./pages/organization_pages/RegisterOrganization'))
const OrganizationSettings = lazy(() => import('./pages/organization_pages/OrganizationSetting'))
const OutletMain = lazy(() => import('./pages/outlet_pages/OutletMain'))
const MenuCategory = lazy(() => import('./pages/menu_category_pages/MenuCategoryMain'))
const MenuItemMain = lazy(() => import('./pages/menu_item_pages/MenuItemMain'))
const RestaurantTableMain = lazy(() => import('./pages/restaurantTable_pages/RestaurantTablemain'))
const InventoryMain = lazy(() => import('./pages/inventory_pages/InventoryMain'))
const VendorMain = lazy(() => import('./pages/vendor_pages/VendorMain'))
const WasteAdjustmentMain = lazy(() => import('./pages/wasteAdjustment_pages/WasteAdjustmentMain'))
const CustomerMain = lazy(() => import('./pages/customer_pages/CustomerMain'))
const OfferMain = lazy(() => import('./pages/offer_pages/OfferMain'))
const LoyaltyProgramMain = lazy(() => import('./pages/loyalty_program_pages/LoyaltyProgramMain'))
const RecipeCostMain = lazy(() => import('./pages/recipeCost_pages/RecipeCostMain'))
const PurchaseMain = lazy(() => import('./pages/purchase_pages/PurchaseMain'))
const CentralKitchenMain = lazy(() => import('./pages/centralKitchen_pages/CentralKitchenMain'))
const SupportTicketMain = lazy(() => import('./pages/supportTicket_pages/SupportTicketMain'))
const TaxSettingsMain = lazy(() => import('./pages/Taxsetting_pages/TaxSettingMain'))
const PrinterSettingsMain = lazy(() => import('./pages/printer_pages/PrinterMain'))
const SubscriptionMain = lazy(() => import('./pages/subscription_pages/Subscription'))
const IntegrationMain = lazy(() => import('./pages/integration_pages/IntegrationMain'))
const ReportDashboardMain = lazy(() => import('./pages/reports/ReportDashboardMain'))

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
              <Route path="integrations" element={<IntegrationMain />} />
              <Route path="report" element={<ReportDashboardMain />} />
              <Route path="payment" element={<PaymentMain />} />
              <Route path="kitchen" element={<KitchenMain />} />
              <Route path="notification-setting" element={<NotificationSettingMain />} />
              <Route path="notification" element={<NotificationMain />} />
              <Route path="menu-item" element={<MenuItemMain />} />
              <Route path="profile" element={<UserProfile />} />
              <Route path="order" element={<OrderMain />} />
              <Route path="role" element={<RoleMain />} />
              <Route path="myorders" element={<MyOrdersMain />} />

              <Route path="users" element={<UserMain />} >
                <Route path="single/:userId" element={<UserSingle />} />
              </Route>

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