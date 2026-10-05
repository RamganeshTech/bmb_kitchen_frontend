import { ExpenseReport } from "./ExpenseReport";
import { GstSummaryReport } from "./GstSummaryReport";
import { ItemSalesReport } from "./ItemSalesReport";
import { PaymentModeReport } from "./PaymentModeReport";
import { ReportFilterBar } from "./ReportFilterBar";
import { ReportFilterProvider } from "./ReportFilterProvider";
import { SalesOrderTypeReport } from "./SalesOrderTypeReport";
import { SalesSummaryReport } from "./SalesSummaryReport";
import { SalesTrendReport } from "./SalesTrendReport";

const ReportDashboardMain = () => (
  <ReportFilterProvider>
    <div className="flex w-full flex-col gap-5 p-2">
      {/* your standard page header */}
      <ReportFilterBar />
      <SalesSummaryReport />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2"><SalesTrendReport /></div>
        <SalesOrderTypeReport />
      </div>
      <PaymentModeReport />
      <ItemSalesReport />
      <ExpenseReport />
      <GstSummaryReport />
    </div>
  </ReportFilterProvider>
);


export default ReportDashboardMain;