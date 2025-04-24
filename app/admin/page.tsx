"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import {
  BarChart3,
  Calendar,
  ChevronDown,
  CreditCard,
  DollarSign,
  Download,
  FileText,
  Home,
  LogOut,
  Menu,
  PieChart,
  Plus,
  Settings,
  ShoppingCart,
  Sliders,
  Store,
  Users,
  X,
  Loader2,
  Paperclip,
  Printer,
  Package,
  Edit, // Tahrirlash uchun ikonka
  LayoutGrid // Kategoriya uchun ikonka
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import axios from "axios"
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

// ApexCharts ni faqat client-side da yuklash
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false })

// Helper funksiya: Token mavjudligini tekshirish va header olish
const getAuthHeader = (currentRouter) => {
  const currentToken = typeof window !== 'undefined' ? localStorage.getItem("token") : null
  if (!currentToken) {
    console.warn("Token topilmadi. Avtorizatsiya headeri bo'sh bo'ladi.")
    if (!toast.isActive('no-token-error')) {
      toast.error("Avtorizatsiya tokeni topilmadi. Iltimos, qayta kiring.", { toastId: 'no-token-error' })
    }
    if (currentRouter && typeof window !== 'undefined' && window.location.pathname !== '/auth') {
      currentRouter.replace("/auth")
    }
    return null
  }
  return {
    "Content-Type": "application/json", // Default Content-Type
    Authorization: `Bearer ${currentToken}`,
  }
}

// To'lov usulini chiroyli ko'rsatish uchun helper funksiya
const getPaymentMethodDisplay = (method) => {
    if (!method) return 'N/A';
    switch (method.toLowerCase()) {
        case 'card': return 'Karta';
        case 'cash': return 'Naqd';
        default: return method;
    }
}

// Chek chiqarish funksiyasi (Dropdown menyuda ishlatiladi)
const printReceipt = (orderDetails) => {
  if (!orderDetails) {
    toast.error("Chek ma'lumotlari topilmadi!")
    return
  }

  const totalItemsPrice = orderDetails.items?.reduce((sum, item) => sum + parseFloat(item.total_price || 0), 0) ?? 0
  const serviceFeeAmount = totalItemsPrice * (parseFloat(orderDetails.service_fee_percent || 0) / 100)
  const finalPrice = parseFloat(orderDetails.final_price || 0)
  const paymentMethodForReceipt = orderDetails.payment?.method ? getPaymentMethodDisplay(orderDetails.payment.method) : 'N/A';

  const receiptHTML = `
    <html>
      <head>
        <title>Chek #${orderDetails.id}</title>
        <meta charset="UTF-8">
        <style>
          @media print { @page { margin: 0; } body { margin: 0.5cm; } }
          body { font-family: 'Arial', sans-serif; margin: 10px; font-size: 10pt; width: 72mm; color: #000; }
          .receipt { width: 100%; }
          .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 10px; }
          .header h1 { margin: 0 0 5px 0; font-size: 14pt; } .header p { margin: 2px 0; }
          .details { margin-bottom: 10px; } .details p { margin: 3px 0; line-height: 1.3; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
          th, td { padding: 3px 1px; text-align: left; vertical-align: top; }
          th { border-bottom: 1px solid #000; font-weight: bold;}
          td:nth-child(2), td:nth-child(3), td:nth-child(4) { text-align: right; }
          th:nth-child(2), th:nth-child(3), th:nth-child(4) { text-align: right; }
          .total { border-top: 1px dashed #000; padding-top: 5px; margin-top: 10px; }
          .total p { margin: 4px 0; display: flex; justify-content: space-between; }
          .total p span:first-child { text-align: left; padding-right: 10px; }
          .total p span:last-child { text-align: right; font-weight: bold; }
          .total p.final-price span:last-child { font-size: 11pt; }
          .footer { text-align: center; margin-top: 15px; font-size: 9pt; border-top: 1px dashed #000; padding-top: 5px;}
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header"><h1>SmartResto</h1><p>Chek #${orderDetails.id}</p></div>
          <div class="details">
            <p>Sana: ${new Date(orderDetails.created_at).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            <p>Mijoz: ${orderDetails.customer_name || 'Noma\'lum'}</p>
            <p>Xodim: ${orderDetails.created_by?.first_name || ''} ${orderDetails.created_by?.last_name || 'N/A'}</p>
            <p>To'lov usuli: ${paymentMethodForReceipt}</p>
            <p>Buyurtma turi: ${orderDetails.order_type_display || 'N/A'}</p>
          </div>
          <table><thead><tr><th>Mahsulot</th><th>Miq.</th><th>Narx</th><th>Jami</th></tr></thead>
            <tbody>${(Array.isArray(orderDetails.items) ? orderDetails.items : []).map(item => `<tr><td>${item.product_details?.name || 'Noma\'lum'}</td><td>${item.quantity}</td><td>${parseFloat(item.unit_price || 0).toLocaleString()}</td><td>${parseFloat(item.total_price || 0).toLocaleString()}</td></tr>`).join('')}</tbody>
          </table>
          <div class="total">
            <p><span>Jami (Mahs.):</span> <span>${totalItemsPrice.toLocaleString()} so'm</span></p>
            ${serviceFeeAmount > 0 ? `<p><span>Xizmat haqi (${orderDetails.service_fee_percent || 0}%):</span> <span>+ ${serviceFeeAmount.toLocaleString()} so'm</span></p>` : ''}
            <p class="final-price"><span>Jami:</span> <span>${finalPrice.toLocaleString()} so'm</span></p>
          </div>
          <div class="footer"><p>Xaridingiz uchun rahmat!</p><p>SmartResto</p></div>
        </div>
      </body>
    </html>
  `; // backtick tugadi

  const printWindow = window.open('', '_blank', 'width=300,height=600');
  if (printWindow) {
    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    printWindow.onload = () => {
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    };
    printWindow.focus();
  } else {
    toast.error("Chop etish oynasini ochib bo'lmadi. Brauzer bloklagan bo'lishi mumkin.");
  }
}; // printReceipt funksiyasi tugadi

// Asosiy Komponent
export default function AdminDashboard() {
  const router = useRouter();

  // --- State Management ---
  const [token, setToken] = useState(null);
  const [isClient, setIsClient] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [dateRange, setDateRange] = useState("weekly");
  const [showAllOrders, setShowAllOrders] = useState(false);
  const [showAddEmployeeDialog, setShowAddEmployeeDialog] = useState(false);
  const [showAddRoleDialog, setShowAddRoleDialog] = useState(false);
  const [isDeleteRoleConfirmOpen, setIsDeleteRoleConfirmOpen] = useState(false);
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false);
  const [showAddProductDialog, setShowAddProductDialog] = useState(false);
  const [showEditEmployeeDialog, setShowEditEmployeeDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [isLoadingEmployeeDetails, setIsLoadingEmployeeDetails] = useState(false);
  const [showEditRoleDialog, setShowEditRoleDialog] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [isLoadingRoleDetails, setIsLoadingRoleDetails] = useState(false);
  // --- Mahsulot Tahrirlash uchun State'lar ---
  const [showEditProductDialog, setShowEditProductDialog] = useState(false); // Tahrirlash modalini boshqarish
  const [editingProduct, setEditingProduct] = useState(null); // Tahrirlanayotgan mahsulot ma'lumotlari
  const [isLoadingProductDetails, setIsLoadingProductDetails] = useState(false); // Mahsulot detallarini yuklash
  const [isUpdatingProduct, setIsUpdatingProduct] = useState(false); // Mahsulotni yangilash jarayoni
  // --- Mahsulot Tahrirlash State'lari Yakuni ---
  // --- Kategoriya uchun State'lar ---
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);
  const [showEditCategoryDialog, setShowEditCategoryDialog] = useState(false);
  const [showDeleteCategoryConfirmDialog, setShowDeleteCategoryConfirmDialog] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: "" });
  const [editingCategory, setEditingCategory] = useState(null); // { id: null, name: "" }
  const [categoryToDelete, setCategoryToDelete] = useState(null); // { id: null, name: "" }
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false); // Delete loading state
  // --- Kategoriya State'lari Yakuni ---

  // Data States
  const [stats, setStats] = useState({ todays_sales: { value: 0, change_percent: 0, comparison_period: "N/A" }, todays_orders: { value: 0, change_percent: 0, comparison_period: "N/A" }, average_check: { value: 0, change_percent: 0, comparison_period: "N/A" }, active_employees: { value: 0, change_absolute: 0, comparison_period: "N/A" } });
  const [salesData, setSalesData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [xodim, setXodim] = useState([]);
  const [fetchedRoles, setFetchedRoles] = useState([]);
  const [rolesList, setRolesList] = useState([]);
  const [employeeReport, setEmployeeReport] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]); // Bu state allaqachon mavjud va ishlatiladi
  const [productReportData, setProductReportData] = useState([]);
  const [customerReport, setCustomerReport] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [orderTypes, setOrderTypes] = useState([]);

  // Form States
  const [newEmployee, setNewEmployee] = useState({ username: "", first_name: "", last_name: "", role_id: "", pin_code: "", is_active: true });
  const [newRole, setNewRole] = useState({ name: "" });
  const [newProduct, setNewProduct] = useState({ name: "", price: "", description: "", is_active: true, category_id: "", cost_price: "", image: null });

  // Settings State
  const [settings, setSettings] = useState({ name: "", address: "", phone: "", email: "", description: "", currency_symbol: "", tax_percent: 0, service_fee_percent: 0 });
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState(null);

  // Other States
  const [roleToDelete, setRoleToDelete] = useState(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [isLoadingOrderDetails, setIsLoadingOrderDetails] = useState(false);
  const [orderDetailsError, setOrderDetailsError] = useState(null);

  // --- Utility Functions ---

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem("token");
    }
    setToken(null);
    toast.info("Tizimdan chiqdingiz.");
    router.replace("/auth");
  }; // handleLogout tugadi

  const handleApiError = (error, contextMessage) => {
    console.error(`${contextMessage} xatolik:`, error);
    let errorDetail = `${contextMessage} xatolik yuz berdi.`;
    let shouldLogout = false;

    if (error.response) {
      if (error.response.status === 401 || error.response.status === 403) {
        errorDetail = "Sessiya muddati tugagan yoki ruxsat yo'q. Iltimos, qayta kiring.";
        shouldLogout = true;
      } else {
        const data = error.response.data;
        if (data && typeof data === 'object') {
          if (data.detail) {
            errorDetail = data.detail;
          } else if (Array.isArray(data)) {
            errorDetail = data.map(err => typeof err === 'string' ? err : (err.field ? `${err.field}: ${err.message}` : JSON.stringify(err))).join('; ');
          } else {
            // Kategoriya xatoliklarini aniqroq ko'rsatish
            if (contextMessage.toLowerCase().includes('kategoriya') && data.name && Array.isArray(data.name)) {
                errorDetail = `Kategoriya nomi: ${data.name.join(', ')}`;
            } else {
                errorDetail = Object.entries(data).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`).join('; ');
            }
          }
        } else if (typeof data === 'string') {
          errorDetail = data;
        } else {
          errorDetail = `Serverdan kutilmagan javob (status: ${error.response.status}).`;
        }
        if (!shouldLogout && contextMessage && !errorDetail.toLowerCase().startsWith(contextMessage.toLowerCase().split(':')[0])) {
             errorDetail = `${contextMessage}: ${errorDetail}`;
        }
      }
    } else if (error.request) {
      errorDetail = `${contextMessage}: Serverdan javob olinmadi. Internet aloqasini tekshiring.`;
    } else {
      errorDetail = `${contextMessage} xatolik: ${error.message}`;
    }

    const toastId = contextMessage.replace(/[^a-zA-Z0-9-_]/g, '');
    if (!toast.isActive(toastId)) {
      toast.error(errorDetail, { toastId: toastId });
    }

    if (shouldLogout) {
      setTimeout(handleLogout, 1500);
    }
  }; // handleApiError tugadi

  // --- useEffect Hooks ---

  useEffect(() => {
    setIsClient(true);
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
    if (!storedToken && typeof window !== 'undefined' && window.location.pathname !== '/auth') {
      router.replace("/auth");
    } else {
      setToken(storedToken);
    }
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Boshlang'ich tekshiruv

  useEffect(() => {
    if (!token || !isClient) return;

    const headers = getAuthHeader(router);
    if (!headers) return;

    let isMounted = true;

    const fetchData = async () => {
        try {
            // categoriesRes allaqachon olinayotgan edi, shu yerda ishlatamiz
            const [
                ordersRes, statsRes, usersRes, rolesRes, empReportRes,
                prodReportRes, productsRes, categoriesRes, custReportRes,
                chartsRes, salesChartRes
            ] = await Promise.all([
                axios.get(`https://oshxonacopy.pythonanywhere.com/api/orders/`, { headers }),
                axios.get(`https://oshxonacopy.pythonanywhere.com/api/admin/dashboard/stats/`, { headers }),
                axios.get(`https://oshxonacopy.pythonanywhere.com/api/admin/users/`, { headers }),
                axios.get(`https://oshxonacopy.pythonanywhere.com/api/admin/roles/`, { headers }),
                axios.get(`https://oshxonacopy.pythonanywhere.com/api/admin/reports/employees/`, { headers }),
                axios.get(`https://oshxonacopy.pythonanywhere.com/api/admin/reports/products/`, { headers }),
                axios.get(`https://oshxonacopy.pythonanywhere.com/api/products/`, { headers }),
                axios.get(`https://oshxonacopy.pythonanywhere.com/api/categories/`, { headers }), // BU YERDA OLINADI
                axios.get(`https://oshxonacopy.pythonanywhere.com/api/admin/reports/customers/`, { headers }),
                axios.get(`https://oshxonacopy.pythonanywhere.com/api/admin/reports/charts/`, { headers }),
                axios.get(`https://oshxonacopy.pythonanywhere.com/api/admin/dashboard/sales-chart/`, { headers })
            ]);

            if (!isMounted) return;

            const ordersData = ordersRes.data ?? [];
            const sortedOrders = ordersData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setRecentOrders(sortedOrders.slice(0, 5));
            setOrders(sortedOrders);

            const defaultStats = { todays_sales: { value: 0, change_percent: 0, comparison_period: "N/A" }, todays_orders: { value: 0, change_percent: 0, comparison_period: "N/A" }, average_check: { value: 0, change_percent: 0, comparison_period: "N/A" }, active_employees: { value: 0, change_absolute: 0, comparison_period: "N/A" }};
            const receivedStats = statsRes.data || {};
            setStats({ todays_sales: receivedStats.todays_sales ?? defaultStats.todays_sales, todays_orders: receivedStats.todays_orders ?? defaultStats.todays_orders, average_check: receivedStats.average_check ?? defaultStats.average_check, active_employees: receivedStats.active_employees ?? defaultStats.active_employees });

            setXodim(usersRes.data ?? []);
            const rolesData = rolesRes.data ?? [];
            setRolesList(rolesData);
            setFetchedRoles(rolesData);
            setEmployeeReport(empReportRes.data ?? []);
            setProductReportData(prodReportRes.data ?? []);
            setCustomerReport(custReportRes.data ?? []);
            setProducts(productsRes.data ?? []);
            setCategories(categoriesRes.data ?? []); // Kategoriyalarni state'ga o'rnatish
            setPaymentMethods(chartsRes.data?.payment_methods || []);
            setOrderTypes(chartsRes.data?.order_types || []);
            setSalesData(salesChartRes.data ?? []);

        } catch (err) {
            if (isMounted) {
                handleApiError(err, "Asosiy ma'lumotlarni yuklashda");
                 // Reset states on error
                setRecentOrders([]); setOrders([]);
                setStats({ todays_sales: { value: 0, change_percent: 0, comparison_period: "N/A" }, todays_orders: { value: 0, change_percent: 0, comparison_period: "N/A" }, average_check: { value: 0, change_percent: 0, comparison_period: "N/A" }, active_employees: { value: 0, change_absolute: 0, comparison_period: "N/A" }});
                setXodim([]); setRolesList([]); setFetchedRoles([]);
                setEmployeeReport([]); setProductReportData([]); setCustomerReport([]);
                setProducts([]); setCategories([]); // Reset categories on error
                setPaymentMethods([]); setOrderTypes([]);
                setSalesData([]);
            }
        }
    }; // fetchData tugadi

    fetchData();

    return () => {
      isMounted = false;
    };
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isClient]); // Token/client o'zgarganda qayta yuklash

  useEffect(() => {
    if (!token || !isClient) return;

    const headers = getAuthHeader(router);
    if (!headers) return;

    let isMounted = true;
    const source = axios.CancelToken.source();

    axios.get(`https://oshxonacopy.pythonanywhere.com/api/admin/dashboard/top-products/?period=${dateRange}`, {
      headers,
      cancelToken: source.token
    })
      .then((res) => { if(isMounted) setTopProducts(res.data ?? []); })
      .catch((err) => {
        if (isMounted && !axios.isCancel(err)) {
          handleApiError(err, "Eng ko'p sotilgan mahsulotlarni yuklashda");
          setTopProducts([]);
        }
      });

    return () => { isMounted = false; source.cancel("So'rov bekor qilindi."); };
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, token, isClient]); // dateRange/token/client o'zgarganda qayta yuklash

  useEffect(() => {
    if (token && isClient && activeTab === "settings") {
      const headers = getAuthHeader(router);
      if (!headers) return;

      let isMounted = true;
      setIsLoadingSettings(true);
      setSettingsError(null);

      axios.get(`https://oshxonacopy.pythonanywhere.com/api/admin/settings/`, { headers })
        .then((res) => { if(isMounted) setSettings(res.data || {}); })
        .catch((err) => {
            if(isMounted) {
                handleApiError(err, "Sozlamalarni yuklashda");
                setSettingsError("Sozlamalarni yuklashda xatolik yuz berdi.");
            }
        })
        .finally(() => { if(isMounted) setIsLoadingSettings(false); });

        return () => { isMounted = false; };
    }
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isClient, activeTab]); // activeTab/token/client o'zgarganda qayta yuklash

  // --- Data Refresh Functions ---

  const refreshOrders = () => {
    const headers = getAuthHeader(router)
    if (!headers) return
    toast.promise(
      axios.get(`https://oshxonacopy.pythonanywhere.com/api/orders/`, { headers })
        .then((res) => {
          const data = res.data ?? []
          const sortedData = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          setRecentOrders(sortedData.slice(0, 5))
          setOrders(sortedData)
        }),
      { pending: 'Buyurtmalar yangilanmoqda...', success: 'Buyurtmalar muvaffaqiyatli yangilandi!', error: 'Buyurtmalarni yangilashda xatolik!' }
    ).catch(err => handleApiError(err, "Buyurtmalarni yangilashda"))
  }; // refreshOrders tugadi

  const refreshEmployees = () => {
    const headers = getAuthHeader(router)
    if (!headers) return
    toast.promise(
      axios.get(`https://oshxonacopy.pythonanywhere.com/api/admin/users/`, { headers })
        .then((res) => { setXodim(res.data ?? []) }),
      { pending: 'Xodimlar yangilanmoqda...', success: 'Xodimlar ro\'yxati yangilandi!', error: 'Xodimlarni yangilashda xatolik!' }
    ).catch(err => handleApiError(err, "Xodimlarni yangilashda"))
  }; // refreshEmployees tugadi

  const refreshRoles = () => {
    const headers = getAuthHeader(router)
    if (!headers) return
    toast.promise(
      axios.get(`https://oshxonacopy.pythonanywhere.com/api/admin/roles/`, { headers })
        .then((res) => {
          const rolesData = res.data ?? []
          setRolesList(rolesData)
          setFetchedRoles(rolesData)
        }),
      { pending: 'Rollar yangilanmoqda...', success: 'Rollar ro\'yxati yangilandi!', error: 'Rollarni yangilashda xatolik!' }
    ).catch(err => {
      handleApiError(err, "Rollarni yangilashda")
      setRolesList([])
      setFetchedRoles([])
    })
  }; // refreshRoles tugadi

  const refreshProducts = () => {
    const headers = getAuthHeader(router)
    if (!headers) return
    toast.promise(
      axios.get(`https://oshxonacopy.pythonanywhere.com/api/products/`, { headers })
        .then((res) => { setProducts(res.data ?? []) }),
      { pending: 'Mahsulotlar yangilanmoqda...', success: 'Mahsulotlar ro\'yxati yangilandi!', error: 'Mahsulotlarni yangilashda xatolik!' }
    ).catch(err => handleApiError(err, "Mahsulotlarni yangilashda"))
  }; // refreshProducts tugadi

  // --- YANGI: Kategoriyalarni yangilash funksiyasi ---
  const refreshCategories = () => {
    const headers = getAuthHeader(router);
    if (!headers) return;
    toast.promise(
      axios.get(`https://oshxonacopy.pythonanywhere.com/api/categories/`, { headers })
        .then((res) => {
          setCategories(res.data ?? []);
        }),
      { pending: 'Kategoriyalar yangilanmoqda...', success: 'Kategoriyalar ro\'yxati yangilandi!', error: 'Kategoriyalarni yangilashda xatolik!' }
    ).catch(err => {
        handleApiError(err, "Kategoriyalarni yangilashda");
        setCategories([]); // Xatolik bo'lsa tozalash
    });
  }; // refreshCategories tugadi

  // --- Action Handlers ---

  const handleCancelOrder = async (orderId) => {
    const headers = getAuthHeader(router);
    if (!headers) return;

    toast.promise(
      axios.post(
        `https://oshxonacopy.pythonanywhere.com/api/orders/${orderId}/cancel_order/`,
        {},
        { headers }
      ).then(response => {
        if (response.status === 200 || response.status === 204) {
          refreshOrders();
          if (showOrderDetailsModal && selectedOrderDetails?.id === orderId) {
             handleShowOrderDetails(orderId);
          }
          return `Buyurtma #${orderId} muvaffaqiyatli bekor qilindi!`;
        } else {
          throw new Error(`Buyurtmani bekor qilishda kutilmagan javob: ${response.status}`);
        }
      }),
      {
        pending: `Buyurtma #${orderId} bekor qilinmoqda...`,
        success: { render: ({ data }) => data },
        error: {
          render: ({ data }) => {
            handleApiError(data, `Buyurtma #${orderId} ni bekor qilishda`);
            return `Buyurtma #${orderId} ni bekor qilishda xatolik!`;
          }
        }
      }
    );
  }; // handleCancelOrder tugadi

  const handleAddEmployee = async () => {
    if (!newEmployee.username || !newEmployee.first_name || !newEmployee.last_name || !newEmployee.role_id || !newEmployee.pin_code) {
      toast.error("Iltimos, barcha yulduzchali (*) maydonlarni to'ldiring.")
      return
    }
    if (!/^\d{4}$/.test(newEmployee.pin_code)) {
      toast.error("PIN-kod 4 ta raqamdan iborat bo'lishi kerak.")
      return
    }
    const headers = getAuthHeader(router)
    if (!headers) return

    const employeeData = {
        username: newEmployee.username.trim(),
        first_name: newEmployee.first_name.trim(),
        last_name: newEmployee.last_name.trim(),
        role_id: parseInt(newEmployee.role_id),
        pin_code: newEmployee.pin_code,
        is_active: newEmployee.is_active,
    };

    toast.promise(
        axios.post("https://oshxonacopy.pythonanywhere.com/api/admin/users/", employeeData, { headers })
            .then(response => {
                if (response.status === 201) {
                    setNewEmployee({ username: "", first_name: "", last_name: "", role_id: "", pin_code: "", is_active: true });
                    setShowAddEmployeeDialog(false);
                    refreshEmployees();
                    return `Xodim "${employeeData.first_name}" muvaffaqiyatli qo'shildi!`;
                } else {
                     throw new Error(`Xodim qo'shishda kutilmagan javob: ${response.status}`);
                }
            }),
        {
            pending: 'Xodim qo\'shilmoqda...',
            success: { render({ data }) { return data; } },
            error: { render({ data }) { handleApiError(data, "Xodim qo'shishda"); return "Xodim qo'shishda xatolik!"; }}
        }
    );
  }; // handleAddEmployee tugadi

  const handleEditEmployeeClick = async (employee) => {
    if (!employee || !employee.id) {
        toast.error("Xodim ma'lumotlarini olish uchun ID topilmadi.");
        return;
    }
    const headers = getAuthHeader(router);
    if (!headers) return;

    setEditingEmployee(null);
    setShowEditEmployeeDialog(true);
    setIsLoadingEmployeeDetails(true);

    try {
        const response = await axios.get(`https://oshxonacopy.pythonanywhere.com/api/admin/users/${employee.id}/`, { headers });
        if (response.data) {
            setEditingEmployee({
                ...response.data,
                role_id: response.data.role?.id,
                pin_code: '',
            });
        } else {
            throw new Error("Xodim ma'lumotlari topilmadi");
        }
    } catch (err) {
        handleApiError(err, `Xodim #${employee.id} ma'lumotlarini olishda`);
        setShowEditEmployeeDialog(false);
    } finally {
        setIsLoadingEmployeeDetails(false);
    }
  }; // handleEditEmployeeClick tugadi

  const handleUpdateEmployee = async () => {
    if (!editingEmployee || !editingEmployee.id) {
        toast.error("Tahrirlanayotgan xodim ma'lumotlari topilmadi.");
        return;
    }
    if (!editingEmployee.username || !editingEmployee.first_name || !editingEmployee.last_name || !editingEmployee.role_id) {
        toast.error("Iltimos, username, ism, familiya va rol maydonlarini to'ldiring.");
        return;
    }
    if (!editingEmployee.pin_code || !/^\d{4}$/.test(editingEmployee.pin_code)) {
        toast.error("PIN-kod 4 ta raqamdan iborat bo'lishi kerak.");
        return;
    }

    const headers = getAuthHeader(router);
    if (!headers) return;

    const updateData = {
        username: editingEmployee.username.trim(),
        first_name: editingEmployee.first_name.trim(),
        last_name: editingEmployee.last_name.trim(),
        role_id: parseInt(editingEmployee.role_id),
        pin_code: editingEmployee.pin_code,
        is_active: editingEmployee.is_active,
    };

    const employeeId = editingEmployee.id;
    const employeeName = `${updateData.first_name} ${updateData.last_name}`;

    toast.promise(
        axios.put(`https://oshxonacopy.pythonanywhere.com/api/admin/users/${employeeId}/`, updateData, { headers })
            .then(response => {
                if (response.status === 200) {
                    setShowEditEmployeeDialog(false);
                    setEditingEmployee(null);
                    refreshEmployees();
                    return `Xodim "${employeeName}" ma'lumotlari muvaffaqiyatli yangilandi!`;
                } else {
                    throw new Error(`Xodimni yangilashda kutilmagan javob: ${response.status}`);
                }
            }),
        {
            pending: 'Xodim ma\'lumotlari yangilanmoqda...',
            success: { render({ data }) { return data; } },
            error: { render({ data }) { handleApiError(data, `Xodim #${employeeId} ni yangilashda`); return "Xodimni yangilashda xatolik!"; }}
        }
    );
  }; // handleUpdateEmployee tugadi


  const handleAddRole = async () => {
    if (!newRole.name || newRole.name.trim() === "") {
      toast.error("Iltimos, rol nomini kiriting.")
      return
    }
    const headers = getAuthHeader(router)
    if (!headers) return

    const roleData = { name: newRole.name.trim() };

    toast.promise(
        axios.post("https://oshxonacopy.pythonanywhere.com/api/admin/roles/", roleData, { headers })
            .then(response => {
                if (response.status === 201) {
                    setNewRole({ name: "" });
                    setShowAddRoleDialog(false);
                    refreshRoles();
                    return `Rol "${roleData.name}" muvaffaqiyatli qo'shildi!`;
                } else {
                     throw new Error(`Rol qo'shishda kutilmagan javob: ${response.status}`);
                }
            }),
        {
            pending: 'Rol qo\'shilmoqda...',
            success: { render({ data }) { return data; } },
            error: { render({ data }) { handleApiError(data, "Rol qo'shishda"); return "Rol qo'shishda xatolik!"; }}
        }
    );
  }; // handleAddRole tugadi

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price || !newProduct.category_id) {
      toast.error("Iltimos, mahsulot nomi, narxi va kategoriyasini kiriting.")
      return
    }
    if (isNaN(newProduct.price) || parseFloat(newProduct.price) <= 0) {
      toast.error("Narx musbat raqam bo'lishi kerak.")
      return
    }
    if (newProduct.cost_price && (isNaN(newProduct.cost_price) || parseFloat(newProduct.cost_price) < 0)) {
        toast.error("Tannarx manfiy bo'lmagan raqam bo'lishi kerak.")
        return
    }

    const headers = getAuthHeader(router)
    if (!headers) return

    // Content-Type: multipart/form-data uchun alohida header
    const formDataHeaders = {
        ...headers, // Mavjud headerlarni saqlab qolish (masalan, Authorization)
        "Content-Type": "multipart/form-data",
    };

    const formData = new FormData()
    formData.append("name", newProduct.name.trim())
    formData.append("price", parseFloat(newProduct.price).toFixed(2)) // Decimal formatida yuborish
    formData.append("category_id", newProduct.category_id)
    if (newProduct.description) {
      formData.append("description", newProduct.description.trim())
    }
    if (newProduct.cost_price) {
      formData.append("cost_price", parseFloat(newProduct.cost_price).toFixed(2)) // Decimal formatida yuborish
    }
    if (newProduct.image instanceof File) {
      formData.append("image", newProduct.image)
    }
    formData.append("is_active", newProduct.is_active ? "true" : "false")

    const productName = newProduct.name.trim();

    toast.promise(
        axios.post(
            "https://oshxonacopy.pythonanywhere.com/api/products/",
            formData,
            { headers: formDataHeaders } // Yangilangan headerlarni ishlatish
        ).then(response => {
            if (response.status === 201) {
                setNewProduct({ name: "", price: "", description: "", is_active: true, category_id: "", cost_price: "", image: null });
                setShowAddProductDialog(false);
                refreshProducts();
                refreshCategories(); // Mahsulot qo'shilganda kategoriyalar ham yangilanishi mumkin (agar yangi kategoriya yaratilsa)
                return `Mahsulot "${productName}" muvaffaqiyatli qo'shildi!`;
            } else {
                throw new Error(`Mahsulot qo'shishda kutilmagan javob: ${response.status}`);
            }
        }),
        {
            pending: 'Mahsulot qo\'shilmoqda...',
            success: { render({ data }) { return data; } },
            error: { render({ data }) { handleApiError(data, "Mahsulot qo'shishda"); return "Mahsulot qo'shishda xatolik!"; }}
        }
    );
  }; // handleAddProduct tugadi

  const handleDeleteEmployee = async (employee) => {
    if (!confirm(`Haqiqatan ham "${employee.first_name} ${employee.last_name}" (ID: ${employee.id}) xodimni o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi.`)) return
    const headers = getAuthHeader(router)
    if (!headers) return

    const employeeName = `${employee.first_name} ${employee.last_name}`;

    toast.promise(
        axios.delete(`https://oshxonacopy.pythonanywhere.com/api/admin/users/${employee.id}/`, { headers })
            .then(response => {
                if (response.status === 204) {
                    refreshEmployees();
                    return `Xodim "${employeeName}" muvaffaqiyatli o'chirildi!`;
                } else {
                     throw new Error(`Xodimni o'chirishda kutilmagan javob: ${response.status}`);
                }
            }),
        {
            pending: 'Xodim o\'chirilmoqda...',
            success: { render({ data }) { return data; } },
            error: { render({ data }) { handleApiError(data, `Xodim (ID: ${employee.id}) ni o'chirishda`); return `Xodimni o'chirishda xatolik!`; }}
        }
    );
  }; // handleDeleteEmployee tugadi

  const handleDeleteProduct = async (product) => {
    if (!confirm(`Haqiqatan ham "${product.name}" (ID: ${product.id}) mahsulotni o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi.`)) return
    const headers = getAuthHeader(router)
    if (!headers) return

    const productName = product.name;

    toast.promise(
        axios.delete(`https://oshxonacopy.pythonanywhere.com/api/products/${product.id}/`, { headers })
            .then(response => {
                if (response.status === 204) {
                    refreshProducts();
                    return `Mahsulot "${productName}" muvaffaqiyatli o'chirildi!`;
                } else {
                    throw new Error(`Mahsulotni o'chirishda kutilmagan javob: ${response.status}`);
                }
            }),
         {
            pending: 'Mahsulot o\'chirilmoqda...',
            success: { render({ data }) { return data; } },
            error: { render({ data }) { handleApiError(data, `Mahsulot (ID: ${product.id}) ni o'chirishda`); return `Mahsulotni o'chirishda xatolik!`; }}
        }
    );
  }; // handleDeleteProduct tugadi

  const handleDeleteRole = (role) => {
    setRoleToDelete({
      id: role.id,
      name: role.name,
      employee_count: role.employee_count ?? role.count ?? 0
    })
    setIsDeleteRoleConfirmOpen(true)
  }; // handleDeleteRole tugadi

  const confirmDeleteRole = async () => {
    if (!roleToDelete || !roleToDelete.id) return
    if (roleToDelete.employee_count > 0) {
        toast.error(`"${roleToDelete.name}" rolini o'chirib bo'lmaydi, chunki unga xodimlar biriktirilgan.`);
        setIsDeleteRoleConfirmOpen(false);
        setRoleToDelete(null);
        return;
    }
    const headers = getAuthHeader(router)
    if (!headers) return

    const roleName = roleToDelete.name;

    toast.promise(
        axios.delete(
            `https://oshxonacopy.pythonanywhere.com/api/admin/roles/${roleToDelete.id}/`,
            { headers }
        ).then(response => {
            if (response.status === 204) {
                refreshRoles();
                return `Rol "${roleName}" muvaffaqiyatli o'chirildi!`;
            } else {
                throw new Error(`Rolni o'chirishda kutilmagan javob: ${response.status}`);
            }
        }),
        {
            pending: 'Rol o\'chirilmoqda...',
            success: { render({ data }) { return data; } },
            error: { render({ data }) {
                if (data.response?.status === 400 && data.response?.data?.detail?.toLowerCase().includes("cannot delete role with assigned users")) {
                    const count = roleToDelete.employee_count || 'bir nechta';
                    toast.error(`"${roleName}" rolini o'chirib bo'lmaydi, chunki unga ${count} ta xodim biriktirilgan.`);
                    return `"${roleName}" rolini o'chirib bo'lmaydi.`;
                } else {
                     handleApiError(data, `"${roleName}" rolini o'chirishda`);
                     return `Rolni o'chirishda xatolik!`;
                }
            }}
        }
    ).finally(() => {
        setIsDeleteRoleConfirmOpen(false);
        setRoleToDelete(null);
    });
  }; // confirmDeleteRole tugadi


  const handleShowOrderDetails = async (orderId) => {
    if (!orderId) {
      console.error("Buyurtma ID si topilmadi!")
      toast.error("Buyurtma ID si topilmadi!", { toastId: "order-id-missing" })
      return
    }
    const headers = getAuthHeader(router)
    if (!headers) return

    setShowOrderDetailsModal(true)
    setIsLoadingOrderDetails(true)
    setSelectedOrderDetails(null)
    setOrderDetailsError(null)

    try {
      const response = await axios.get(
        `https://oshxonacopy.pythonanywhere.com/api/orders/${orderId}/`,
        { headers }
      )
      setSelectedOrderDetails(response.data)
      console.log("Order Details API Response:", response.data);
      setOrderDetailsError(null)
    } catch (err) {
      handleApiError(err, `Buyurtma #${orderId} tafsilotlarini olishda`)
      setOrderDetailsError(`Tafsilotlarni yuklashda xatolik yuz berdi. Qaytadan urinib ko'ring.`)
      setSelectedOrderDetails(null)
    } finally {
      setIsLoadingOrderDetails(false)
    }
  }; // handleShowOrderDetails tugadi

  const handleModalClose = () => {
    setShowOrderDetailsModal(false)
    setTimeout(() => {
      setSelectedOrderDetails(null)
      setIsLoadingOrderDetails(false)
      setOrderDetailsError(null)
    }, 300)
  }; // handleModalClose tugadi

  const handleUpdateSettings = async () => {
    const headers = getAuthHeader(router);
    if (!headers) return;

    if (!settings.name || settings.name.trim() === "") {
        toast.error("Restoran nomi (*) majburiy maydon.");
        return;
    }

    const processedSettings = {
        ...settings,
        tax_percent: settings.tax_percent === null || settings.tax_percent === '' ? null : parseFloat(settings.tax_percent) || 0,
        service_fee_percent: settings.service_fee_percent === null || settings.service_fee_percent === '' ? null : parseFloat(settings.service_fee_percent) || 0,
    };

    Object.keys(processedSettings).forEach(key => {
      if (processedSettings[key] === "") {
         processedSettings[key] = null;
      }
    });

    toast.promise(
        axios.put(
            `https://oshxonacopy.pythonanywhere.com/api/admin/settings/`,
            processedSettings,
            { headers }
        ).then(response => {
            if (response.status === 200) {
                setSettings(response.data);
                return "Sozlamalar muvaffaqiyatli yangilandi!";
            } else {
                throw new Error(`Sozlamalarni yangilashda kutilmagan javob: ${response.status}`);
            }
        }),
        {
            pending: 'Sozlamalar yangilanmoqda...',
            success: { render({ data }) { return data; } },
            error: { render({ data }) { handleApiError(data, "Sozlamalarni yangilashda"); return "Sozlamalarni yangilashda xatolik!"; }}
        }
    );
  }; // handleUpdateSettings tugadi

  const handleEditRoleClick = async (role) => {
    if (!role || !role.id) {
      toast.error("Rol ma'lumotlarini olish uchun ID topilmadi.");
      return;
    }
    const headers = getAuthHeader(router);
    if (!headers) return;

    setEditingRole(null);
    setShowEditRoleDialog(true);
    setIsLoadingRoleDetails(true);

    try {
      // Rolni tahrirlash uchun GET so'rovi shart emas, chunki faqat nomi tahrirlanadi
      // Agar API murakkabroq bo'lsa kerak bo'lardi
      setEditingRole({ id: role.id, name: role.name });
      setIsLoadingRoleDetails(false); // Tezda false qilish
    } catch (err) {
      handleApiError(err, `Rol #${role.id} ma'lumotlarini olishda`);
      setShowEditRoleDialog(false);
      setIsLoadingRoleDetails(false);
    }
  }; // handleEditRoleClick tugadi

  const handleUpdateRole = async () => {
    if (!editingRole || !editingRole.id || !editingRole.name?.trim()) {
      toast.error("Iltimos, rol nomini kiriting.");
      return;
    }
    if (editingRole.name.trim().length < 1 || editingRole.name.trim().length > 100) {
        toast.error("Rol nomi 1 dan 100 gacha belgidan iborat bo'lishi kerak.");
        return;
    }

    const headers = getAuthHeader(router);
    if (!headers) return;

    const updateData = { name: editingRole.name.trim() };
    const roleId = editingRole.id;
    const roleName = updateData.name;

    toast.promise(
      axios.put(`https://oshxonacopy.pythonanywhere.com/api/admin/roles/${roleId}/`, updateData, { headers })
        .then(response => {
          if (response.status === 200) {
            setShowEditRoleDialog(false);
            setEditingRole(null);
            refreshRoles();
            return `Rol "${roleName}" muvaffaqiyatli yangilandi!`;
          } else {
            throw new Error(`Rolni yangilashda kutilmagan javob: ${response.status}`);
          }
        }),
      {
        pending: 'Rol yangilanmoqda...',
        success: { render({ data }) { return data; } },
        error: { render({ data }) { handleApiError(data, `Rol #${roleId} ni yangilashda`); return "Rolni yangilashda xatolik!"; }}
      }
    );
  }; // handleUpdateRole tugadi

  // --- Mahsulot Tahrirlash Funksiyalari ---
  const handleEditProductClick = async (product) => {
    if (!product || !product.id) {
        toast.error("Mahsulot ma'lumotlarini olish uchun ID topilmadi.");
        return;
    }
    const headers = getAuthHeader(router);
    if (!headers) return;

    setEditingProduct(null); // Eski ma'lumotni tozalash
    setShowEditProductDialog(true); // Modalni ochish
    setIsLoadingProductDetails(true); // Yuklanish indikatorini yoqish

    try {
        // Mahsulot detallarini olish uchun GET so'rovi
        const response = await axios.get(`https://oshxonacopy.pythonanywhere.com/api/products/${product.id}/`, { headers });
        if (response.data) {
            // Narxlarni string formatiga o'tkazish (Input type="number" uchun)
            // category_id ni string ga o'tkazish (Select uchun)
            setEditingProduct({
                ...response.data,
                price: response.data.price?.toString() || '',
                cost_price: response.data.cost_price?.toString() || '',
                category_id: response.data.category?.id?.toString() || '', // Kategoriyadan faqat ID ni olamiz
                newImage: null, // Yangi rasm tanlanmaganligini bildirish uchun
            });
             console.log("Editing Product Data:", {
                 ...response.data,
                 price: response.data.price?.toString() || '',
                 cost_price: response.data.cost_price?.toString() || '',
                 category_id: response.data.category?.id?.toString() || '',
                 newImage: null,
             });
        } else {
            throw new Error("Mahsulot ma'lumotlari topilmadi");
        }
    } catch (err) {
        handleApiError(err, `Mahsulot #${product.id} ma'lumotlarini olishda`);
        setShowEditProductDialog(false); // Xatolik bo'lsa modalni yopish
    } finally {
        setIsLoadingProductDetails(false); // Yuklanish indikatorini o'chirish
    }
  }; // handleEditProductClick tugadi

  const handleUpdateProduct = async () => {
      if (!editingProduct || !editingProduct.id) {
          toast.error("Tahrirlanayotgan mahsulot ma'lumotlari topilmadi.");
          return;
      }
      // Validatsiya
      if (!editingProduct.name || !editingProduct.price || !editingProduct.category_id) {
          toast.error("Iltimos, mahsulot nomi, narxi va kategoriyasini kiriting.");
          return;
      }
      if (isNaN(editingProduct.price) || parseFloat(editingProduct.price) <= 0) {
          toast.error("Narx musbat raqam bo'lishi kerak.");
          return;
      }
      if (editingProduct.cost_price && (isNaN(editingProduct.cost_price) || parseFloat(editingProduct.cost_price) < 0)) {
          toast.error("Tannarx manfiy bo'lmagan raqam bo'lishi kerak.");
          return;
      }

      const headers = getAuthHeader(router);
      if (!headers) return;

      // PUT so'rovi uchun FormData tayyorlash
      const formData = new FormData();
      formData.append("name", editingProduct.name.trim());
      formData.append("price", parseFloat(editingProduct.price).toFixed(2)); // Decimal formatida
      formData.append("category_id", editingProduct.category_id);
      formData.append("is_active", editingProduct.is_active ? "true" : "false");

      // Ixtiyoriy maydonlarni qo'shish
      if (editingProduct.description) {
          formData.append("description", editingProduct.description.trim());
      }
      if (editingProduct.cost_price) {
          formData.append("cost_price", parseFloat(editingProduct.cost_price).toFixed(2)); // Decimal formatida
      }
      // Agar yangi rasm tanlangan bo'lsa, uni qo'shish
      if (editingProduct.newImage instanceof File) {
          formData.append("image", editingProduct.newImage);
      }
       // Agar yangi rasm tanlanmasa, 'image' maydonini umuman yubormaslik kerak
       // Backend odatda bu holatda eski rasmni saqlab qoladi

      // Content-Type ni o'zgartirish
      const formDataHeaders = {
          ...headers,
          "Content-Type": "multipart/form-data",
      };

      const productId = editingProduct.id;
      const productName = editingProduct.name.trim();
      setIsUpdatingProduct(true); // Yangilash jarayoni boshlandi

      toast.promise(
          axios.put(
              `https://oshxonacopy.pythonanywhere.com/api/products/${productId}/`,
              formData,
              { headers: formDataHeaders }
          ).then(response => {
              if (response.status === 200) { // PUT uchun odatda 200 OK
                  setShowEditProductDialog(false);
                  setEditingProduct(null);
                  refreshProducts(); // Mahsulotlar ro'yxatini yangilash
                  return `Mahsulot "${productName}" muvaffaqiyatli yangilandi!`;
              } else {
                  throw new Error(`Mahsulotni yangilashda kutilmagan javob: ${response.status}`);
              }
          }),
          {
              pending: 'Mahsulot yangilanmoqda...',
              success: { render({ data }) { return data; } },
              error: { render({ data }) { handleApiError(data, `Mahsulot #${productId} ni yangilashda`); return "Mahsulotni yangilashda xatolik!"; }}
          }
      ).finally(() => {
          setIsUpdatingProduct(false); // Yangilash jarayoni tugadi
      });
  }; // handleUpdateProduct tugadi
  // --- Mahsulot Tahrirlash Funksiyalari Yakuni ---

  // --- YANGI: Kategoriya Action Handlers ---
  const handleAddCategory = async () => {
    if (!newCategory.name || newCategory.name.trim() === "") {
      toast.error("Iltimos, kategoriya nomini kiriting.");
      return;
    }
    if (newCategory.name.trim().length > 100) {
        toast.error("Kategoriya nomi 100 belgidan oshmasligi kerak.");
        return;
    }

    const headers = getAuthHeader(router);
    if (!headers) return;

    const categoryData = { name: newCategory.name.trim() };

    toast.promise(
        axios.post("https://oshxonacopy.pythonanywhere.com/api/categories/", categoryData, { headers })
            .then(response => {
                if (response.status === 201) {
                    setNewCategory({ name: "" });
                    setShowAddCategoryDialog(false);
                    refreshCategories(); // Kategoriyalarni yangilash
                    return `Kategoriya "${categoryData.name}" muvaffaqiyatli qo'shildi!`;
                } else {
                    throw new Error(`Kategoriya qo'shishda kutilmagan javob: ${response.status}`);
                }
            }),
        {
            pending: 'Kategoriya qo\'shilmoqda...',
            success: { render({ data }) { return data; } },
            error: { render({ data }) { handleApiError(data, "Kategoriya qo'shishda"); return "Kategoriya qo'shishda xatolik!"; } }
        }
    );
  }; // handleAddCategory tugadi

  const handleEditCategoryClick = (category) => {
      if (!category || !category.id) {
          toast.error("Kategoriyani tahrirlash uchun ID topilmadi.");
          return;
      }
      setEditingCategory({ id: category.id, name: category.name });
      setShowEditCategoryDialog(true);
  }; // handleEditCategoryClick tugadi

  const handleUpdateCategory = async () => {
    if (!editingCategory || !editingCategory.id || !editingCategory.name?.trim()) {
      toast.error("Iltimos, kategoriya nomini kiriting.");
      return;
    }
     if (editingCategory.name.trim().length > 100) {
        toast.error("Kategoriya nomi 100 belgidan oshmasligi kerak.");
        return;
    }

    const headers = getAuthHeader(router);
    if (!headers) return;

    const updateData = { name: editingCategory.name.trim() };
    const categoryId = editingCategory.id;
    const categoryName = updateData.name;
    setIsUpdatingCategory(true);

    toast.promise(
      axios.put(`https://oshxonacopy.pythonanywhere.com/api/categories/${categoryId}/`, updateData, { headers })
        .then(response => {
          if (response.status === 200) {
            setShowEditCategoryDialog(false);
            setEditingCategory(null);
            refreshCategories(); // Kategoriyalar ro'yxatini yangilash
            return `Kategoriya "${categoryName}" muvaffaqiyatli yangilandi!`;
          } else {
            throw new Error(`Kategoriyani yangilashda kutilmagan javob: ${response.status}`);
          }
        }),
      {
        pending: 'Kategoriya yangilanmoqda...',
        success: { render({ data }) { return data; } },
        error: { render({ data }) { handleApiError(data, `Kategoriya #${categoryId} ni yangilashda`); return "Kategoriyani yangilashda xatolik!"; }}
      }
    ).finally(() => {
        setIsUpdatingCategory(false);
    });
  }; // handleUpdateCategory tugadi

  const handleDeleteCategoryClick = (category) => {
      if (!category || !category.id) {
          toast.error("Kategoriyani o'chirish uchun ID topilmadi.");
          return;
      }
      setCategoryToDelete({ id: category.id, name: category.name });
      setShowDeleteCategoryConfirmDialog(true);
  }; // handleDeleteCategoryClick tugadi

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete || !categoryToDelete.id) return;

    const headers = getAuthHeader(router);
    if (!headers) return;

    const categoryId = categoryToDelete.id;
    const categoryName = categoryToDelete.name;
    setIsDeletingCategory(true);

    toast.promise(
        axios.delete(
            `https://oshxonacopy.pythonanywhere.com/api/categories/${categoryId}/`,
            { headers }
        ).then(response => {
            if (response.status === 204) {
                refreshCategories(); // Kategoriyalar ro'yxatini yangilash
                return `Kategoriya "${categoryName}" muvaffaqiyatli o'chirildi!`;
            } else {
                throw new Error(`Kategoriyani o'chirishda kutilmagan javob: ${response.status}`);
            }
        }),
        {
            pending: 'Kategoriya o\'chirilmoqda...',
            success: { render({ data }) { return data; } },
            error: { render({ data }) {
                 // Agar backend 400 qaytarsa (masalan, bog'liq mahsulotlar borligi uchun)
                 if (data.response?.status === 400) {
                     handleApiError(data, `"${categoryName}" kategoriyasini o'chirishda`);
                     return `"${categoryName}" kategoriyasini o'chirishda xatolik: ${data.response?.data?.detail || 'Bog\'liq mahsulotlar mavjud bo\'lishi mumkin.'}`;
                 } else {
                     handleApiError(data, `"${categoryName}" kategoriyasini o'chirishda`);
                     return `Kategoriyani o'chirishda xatolik!`;
                 }
            }}
        }
    ).finally(() => {
        setShowDeleteCategoryConfirmDialog(false);
        setCategoryToDelete(null);
        setIsDeletingCategory(false);
    });
  }; // confirmDeleteCategory tugadi
  // --- Kategoriya Action Handlers Yakuni ---


  // --- Rendering Logic ---

  const safeArray = (data) => (Array.isArray(data) ? data : []);

  const displayedOrders = showAllOrders ? safeArray(orders) : safeArray(recentOrders);
  const validSalesData = safeArray(salesData);
  const validPaymentMethods = safeArray(paymentMethods);
  const validOrderTypes = safeArray(orderTypes);
  const validFetchedRoles = safeArray(fetchedRoles);
  const validXodim = safeArray(xodim);
  const validOrders = safeArray(orders);
  const validEmployeeReport = safeArray(employeeReport);
  const validProducts = safeArray(products);
  const validRolesList = safeArray(rolesList);
  const validTopProducts = safeArray(topProducts);
  const validCategories = safeArray(categories); // Bu endi ishlatiladi
  const validProductReportData = safeArray(productReportData);
  const validCustomerReport = safeArray(customerReport);

  // Loading state or redirect if not authenticated
  if (!isClient || !token) {
    // Agar foydalanuvchi allaqachon /auth sahifasida bo'lsa, hech narsa ko'rsatilmaydi
    if (typeof window !== 'undefined' && window.location.pathname === '/auth') {
      return null;
    }
    // Aks holda, yuklanish indikatorini ko'rsatish
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100 dark:bg-slate-950">
        <Loader2 className="h-12 w-12 animate-spin text-sky-500" />
        <ToastContainer /> {/* Auth sahifasida bo'lmasa ham Toast ko'rinishi uchun */}
      </div>
    );
  }

  // Main authenticated content
  return ( // Asosiy return boshlanishi
    <div className="flex h-screen bg-slate-100 dark:bg-slate-950">
      <ToastContainer
        position="top-right" autoClose={4000} hideProgressBar={false} newestOnTop={false}
        closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="colored"
      />

      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col bg-slate-900 text-white md:flex dark:bg-slate-800">
        <div className="flex h-14 items-center border-b border-slate-700 px-4 dark:border-slate-600">
          <Store className="mr-2 h-6 w-6 text-sky-400" />
          <h1 className="text-lg font-bold">SmartResto Admin</h1>
        </div>
        <ScrollArea className="flex-1">
          <nav className="px-3 py-4">
            <h2 className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Asosiy</h2>
            <div className="space-y-1">
              <Button variant={activeTab === "dashboard" ? "secondary" : "ghost"} className={`w-full justify-start ${activeTab === 'dashboard' ? 'bg-slate-700 dark:bg-slate-600 text-white' : 'hover:bg-slate-700/50 dark:hover:bg-slate-700 text-slate-300 hover:text-white'}`} onClick={() => setActiveTab("dashboard")}><BarChart3 className="mr-2 h-4 w-4" />Boshqaruv paneli</Button>
              <Button variant={activeTab === "reports" ? "secondary" : "ghost"} className={`w-full justify-start ${activeTab === 'reports' ? 'bg-slate-700 dark:bg-slate-600 text-white' : 'hover:bg-slate-700/50 dark:hover:bg-slate-700 text-slate-300 hover:text-white'}`} onClick={() => setActiveTab("reports")}><FileText className="mr-2 h-4 w-4" />Hisobotlar</Button>
              <Button variant={activeTab === "employees" ? "secondary" : "ghost"} className={`w-full justify-start ${activeTab === 'employees' ? 'bg-slate-700 dark:bg-slate-600 text-white' : 'hover:bg-slate-700/50 dark:hover:bg-slate-700 text-slate-300 hover:text-white'}`} onClick={() => setActiveTab("employees")}><Users className="mr-2 h-4 w-4" />Xodimlar</Button>
              <Button variant={activeTab === "roles" ? "secondary" : "ghost"} className={`w-full justify-start ${activeTab === 'roles' ? 'bg-slate-700 dark:bg-slate-600 text-white' : 'hover:bg-slate-700/50 dark:hover:bg-slate-700 text-slate-300 hover:text-white'}`} onClick={() => setActiveTab("roles")}><Sliders className="mr-2 h-4 w-4" />Rollar</Button>
              <Button variant={activeTab === "orders" ? "secondary" : "ghost"} className={`w-full justify-start ${activeTab === 'orders' ? 'bg-slate-700 dark:bg-slate-600 text-white' : 'hover:bg-slate-700/50 dark:hover:bg-slate-700 text-slate-300 hover:text-white'}`} onClick={() => setActiveTab("orders")}><ShoppingCart className="mr-2 h-4 w-4" />Buyurtmalar</Button>
              <Button variant={activeTab === "products" ? "secondary" : "ghost"} className={`w-full justify-start ${activeTab === 'products' ? 'bg-slate-700 dark:bg-slate-600 text-white' : 'hover:bg-slate-700/50 dark:hover:bg-slate-700 text-slate-300 hover:text-white'}`} onClick={() => setActiveTab("products")}><Package className="mr-2 h-4 w-4" />Mahsulotlar</Button>
              {/* --- YANGI: Kategoriya menyusi --- */}
              <Button variant={activeTab === "categories" ? "secondary" : "ghost"} className={`w-full justify-start ${activeTab === 'categories' ? 'bg-slate-700 dark:bg-slate-600 text-white' : 'hover:bg-slate-700/50 dark:hover:bg-slate-700 text-slate-300 hover:text-white'}`} onClick={() => setActiveTab("categories")}><LayoutGrid className="mr-2 h-4 w-4" />Kategoriyalar</Button>
              {/* --- Kategoriya menyusi yakuni --- */}
            </div>
            <h2 className="mb-2 mt-6 px-4 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Tizim</h2>
            <div className="space-y-1">
              <Button variant={activeTab === "settings" ? "secondary" : "ghost"} className={`w-full justify-start ${activeTab === 'settings' ? 'bg-slate-700 dark:bg-slate-600 text-white' : 'hover:bg-slate-700/50 dark:hover:bg-slate-700 text-slate-300 hover:text-white'}`} onClick={() => setActiveTab("settings")}><Settings className="mr-2 h-4 w-4" />Sozlamalar</Button>
              <Button variant="ghost" className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-700/50 dark:hover:bg-slate-700" onClick={() => router.push("/pos")}><Home className="mr-2 h-4 w-4" />POS ga qaytish</Button>
              <Button variant="ghost" className="w-full justify-start text-red-500 hover:bg-red-900/30 hover:text-red-400" onClick={handleLogout}><LogOut className="mr-2 h-4 w-4" />Chiqish</Button>
            </div>
          </nav>
        </ScrollArea>
        <div className="border-t border-slate-700 p-4 dark:border-slate-600">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9"><AvatarImage src="/placeholder-user.jpg" /><AvatarFallback>AD</AvatarFallback></Avatar>
            <div><p className="text-sm font-medium">Admin User</p><p className="text-xs text-slate-400 dark:text-slate-500">Administrator</p></div>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar (Overlay) */}
      {showMobileSidebar && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setShowMobileSidebar(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true"></div>
          <aside className="fixed left-0 top-0 h-full w-64 flex flex-col bg-slate-900 text-white dark:bg-slate-800" onClick={e => e.stopPropagation()}>
            <div className="flex h-14 items-center justify-between border-b border-slate-700 px-4 dark:border-slate-600">
              <div className="flex items-center"><Store className="mr-2 h-6 w-6 text-sky-400" /><h1 className="text-lg font-bold">SmartResto</h1></div>
              <Button variant="ghost" size="icon" onClick={() => setShowMobileSidebar(false)} className="text-slate-400 hover:text-white"><X className="h-6 w-6" /></Button>
            </div>
            <ScrollArea className="flex-1">
              <nav className="px-3 py-4">
                <h2 className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Asosiy</h2>
                <div className="space-y-1">
                  {[
                    { name: 'dashboard', label: 'Boshqaruv paneli', icon: BarChart3 },
                    { name: 'reports', label: 'Hisobotlar', icon: FileText },
                    { name: 'employees', label: 'Xodimlar', icon: Users },
                    { name: 'roles', label: 'Rollar', icon: Sliders },
                    { name: 'orders', label: 'Buyurtmalar', icon: ShoppingCart },
                    { name: 'products', label: 'Mahsulotlar', icon: Package },
                    { name: 'categories', label: 'Kategoriyalar', icon: LayoutGrid }, // --- YANGI: Kategoriya mobil menyusi ---
                  ].map(item => (
                    <Button key={item.name} variant={activeTab === item.name ? "secondary" : "ghost"} className={`w-full justify-start ${activeTab === item.name ? 'bg-slate-700 dark:bg-slate-600 text-white' : 'hover:bg-slate-700/50 dark:hover:bg-slate-700 text-slate-300 hover:text-white'}`} onClick={() => { setActiveTab(item.name); setShowMobileSidebar(false) }}><item.icon className="mr-2 h-4 w-4" />{item.label}</Button>
                  ))}
                </div>
                <h2 className="mb-2 mt-6 px-4 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Tizim</h2>
                <div className="space-y-1">
                  <Button variant={activeTab === "settings" ? "secondary" : "ghost"} className={`w-full justify-start ${activeTab === 'settings' ? 'bg-slate-700 dark:bg-slate-600 text-white' : 'hover:bg-slate-700/50 dark:hover:bg-slate-700 text-slate-300 hover:text-white'}`} onClick={() => { setActiveTab("settings"); setShowMobileSidebar(false) }}><Settings className="mr-2 h-4 w-4" />Sozlamalar</Button>
                  <Button variant="ghost" className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-700/50 dark:hover:bg-slate-700" onClick={() => { router.push("/pos"); setShowMobileSidebar(false) }}><Home className="mr-2 h-4 w-4" />POS ga qaytish</Button>
                  <Button variant="ghost" className="w-full justify-start text-red-500 hover:bg-red-900/30 hover:text-red-400" onClick={() => { handleLogout(); setShowMobileSidebar(false) }}><LogOut className="mr-2 h-4 w-4" />Chiqish</Button>
                </div>
              </nav>
            </ScrollArea>
            <div className="border-t border-slate-700 p-4 dark:border-slate-600">
              <div className="flex items-center gap-3"><Avatar className="h-9 w-9"><AvatarImage src="/placeholder-user.jpg" /><AvatarFallback>AD</AvatarFallback></Avatar><div><p className="text-sm font-medium">Admin User</p><p className="text-xs text-slate-400 dark:text-slate-500">Administrator</p></div></div>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-14 items-center justify-between border-b bg-white px-4 dark:bg-slate-900 dark:border-slate-700">
          <div className="flex items-center gap-2 md:hidden">
            <Button variant="ghost" size="icon" onClick={() => setShowMobileSidebar(true)}><Menu className="h-6 w-6" /></Button>
            <div className="flex items-center"><Store className="h-6 w-6 text-sky-400" /><h1 className="ml-2 text-lg font-bold">SmartResto</h1></div>
          </div>
          <div className="flex flex-grow items-center justify-end gap-4"> {/* Use flex-grow and justify-end */}
            <Button variant="outline" size="sm" className="hidden md:inline-flex gap-1 text-sm">
              <Calendar className="h-4 w-4" />{new Date().toLocaleDateString("uz-UZ", { day: '2-digit', month: 'long', year: 'numeric' })}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" className="relative h-8 w-8 rounded-full"><Avatar className="h-8 w-8"><AvatarImage src="/placeholder-user.jpg" /><AvatarFallback>AD</AvatarFallback></Avatar></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Mening hisobim</DropdownMenuLabel><DropdownMenuSeparator />
                <DropdownMenuItem disabled><Users className="mr-2 h-4 w-4"/>Profil</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('settings')}><Settings className="mr-2 h-4 w-4" />Sozlamalar</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:bg-red-100 focus:text-red-700 dark:focus:bg-red-900/50 dark:focus:text-red-400"><LogOut className="mr-2 h-4 w-4" />Chiqish</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content Body (Scrollable) */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8 bg-slate-100 dark:bg-slate-950">
          {/* Dashboard Tab */}
          {activeTab === "dashboard" && (
            <div className="grid gap-4 md:gap-6 lg:grid-cols-4">
              {/* Dashboard Cards */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Bugungi savdo</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{(stats.todays_sales.value ?? 0).toLocaleString()} so'm</div>
                    <p className={`text-xs ${stats.todays_sales.change_percent >= 0 ? 'text-green-600' : 'text-red-600'} dark:${stats.todays_sales.change_percent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {stats.todays_sales.change_percent >= 0 ? '+' : ''}{stats.todays_sales.change_percent?.toFixed(1) ?? 0}% vs {stats.todays_sales.comparison_period || "kecha"}
                    </p>
                </CardContent>
              </Card>
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Bugungi Buyurtmalar</CardTitle><ShoppingCart className="h-4 w-4 text-muted-foreground" /></CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold">+{stats.todays_orders.value ?? 0}</div>
                      <p className={`text-xs ${stats.todays_orders.change_percent >= 0 ? 'text-green-600' : 'text-red-600'} dark:${stats.todays_orders.change_percent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {stats.todays_orders.change_percent >= 0 ? '+' : ''}{stats.todays_orders.change_percent?.toFixed(1) ?? 0}% vs {stats.todays_orders.comparison_period || "kecha"}
                      </p>
                  </CardContent>
              </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">O'rtacha chek</CardTitle><CreditCard className="h-4 w-4 text-muted-foreground" /></CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{(stats.average_check.value ?? 0).toLocaleString()} so'm</div>
                    <p className={`text-xs ${stats.average_check.change_percent >= 0 ? 'text-green-600' : 'text-red-600'} dark:${stats.average_check.change_percent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {stats.average_check.change_percent >= 0 ? '+' : ''}{stats.average_check.change_percent?.toFixed(1) ?? 0}% vs {stats.average_check.comparison_period || "kecha"}
                    </p>
                  </CardContent>
                </Card>
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Faol xodimlar</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold">{stats.active_employees.value ?? 0}</div>
                      <p className={`text-xs ${stats.active_employees.change_absolute >= 0 ? 'text-green-600' : 'text-red-600'} dark:${stats.active_employees.change_absolute >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {(stats.active_employees.change_absolute ?? 0) >= 0 ? '+' : ''}{stats.active_employees.change_absolute ?? 0} vs {stats.active_employees.comparison_period || "kecha"}
                      </p>
                  </CardContent>
              </Card>

              {/* Savdo dinamikasi */}
              <Card className="col-span-full lg:col-span-2">
                <CardHeader><CardTitle>Savdo dinamikasi (Oxirgi 7 kun)</CardTitle></CardHeader>
                <CardContent className="pl-2 pr-4">
                  {isClient && validSalesData.length > 0 ? (
                    <div className="h-[250px] w-full">
                      <Chart
                        options={{
                          chart: { id: "weekly-sales-chart", toolbar: { show: false }, background: 'transparent' },
                          theme: { mode: typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light' },
                          xaxis: {
                            categories: validSalesData.map((day) => new Date(day.date).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' })),
                            labels: { rotate: -45, style: { fontSize: "10px", colors: '#9ca3af' }, offsetY: 5 }, // Use gray color for labels
                            axisBorder: { show: false }, axisTicks: { show: false }
                          },
                          yaxis: { labels: { formatter: (value) => `${(value / 1000).toFixed(0)}k`, style: { colors: '#9ca3af' } } }, // Use gray color for labels
                          dataLabels: { enabled: false },
                          stroke: { curve: "smooth", width: 2 },
                          colors: ["#3b82f6"], // Tailwind's blue-500
                          grid: { borderColor: "hsl(var(--border))", strokeDashArray: 4, row: { colors: ['transparent', 'transparent'], opacity: 0.5 } },
                          tooltip: {
                             theme: typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light',
                             y: { formatter: (value) => `${value.toLocaleString()} so'm` }
                          },
                          fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.7, opacityTo: 0.3, stops: [0, 90, 100] } }
                        }}
                        series={[{ name: "Savdo", data: validSalesData.map((day) => day.sales) }]}
                        type="area"
                        height="100%" // Use relative height
                        width="100%" // Use relative width
                      />
                    </div>
                  ) : (
                    <div className="flex h-[250px] items-center justify-center text-muted-foreground">
                      {isClient ? "Savdo grafigi uchun ma'lumotlar topilmadi." : "Ma'lumotlar yuklanmoqda..."}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Eng ko'p sotilganlar (Dashboard) */}
              <Card className="col-span-full lg:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                    <CardTitle className="text-base font-semibold">Eng ko'p sotilganlar</CardTitle>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-1">
                                {dateRange === "daily" ? "Bugun" : dateRange === "weekly" ? "Haftalik" : "Oylik"}
                                <ChevronDown className="h-4 w-4 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setDateRange("daily")}>Bugun</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDateRange("weekly")}>Haftalik</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDateRange("monthly")}>Oylik</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[250px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                            <TableHead>Mahsulot</TableHead>
                            <TableHead className="text-right">Miqdor</TableHead>
                            <TableHead className="text-right">Savdo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {validTopProducts.length > 0 ? (
                           validTopProducts.map((product, index) => (
                              <TableRow key={product.product_id || index}>
                                <TableCell className="font-medium">{product.product_name || "Noma'lum"}</TableCell>
                                <TableCell className="text-right">{product.quantity ?? 0}</TableCell>
                                <TableCell className="text-right">{(product.sales ?? 0).toLocaleString()} so'm</TableCell>
                              </TableRow>
                           ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">Bu davr uchun ma'lumot yo'q</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* So'nggi buyurtmalar */}
              <Card className="col-span-full">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                      <CardTitle>So'nggi buyurtmalar</CardTitle>
                      <CardDescription>Oxirgi {displayedOrders.length} ta buyurtma.</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={refreshOrders}>
                      <Paperclip className="mr-2 h-4 w-4"/>Yangilash
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">ID</TableHead>
                        <TableHead>Mijoz</TableHead>
                        <TableHead className="hidden sm:table-cell">Turi</TableHead>
                        <TableHead className="text-right">Jami</TableHead>
                        <TableHead className="hidden md:table-cell">Holat</TableHead>
                        <TableHead className="hidden lg:table-cell text-right">Sana</TableHead>
                        <TableHead className="text-right w-[100px]">Amallar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedOrders.length > 0 ? (
                        displayedOrders.map((order) => (
                            <TableRow key={order.id}>
                            <TableCell className="font-medium">#{order.id}</TableCell>
                            <TableCell>{order.customer_name || "Noma'lum"}</TableCell>
                            <TableCell className="hidden sm:table-cell">{order.order_type_display || 'N/A'}</TableCell>
                            <TableCell className="text-right">{parseFloat(order.final_price || 0).toLocaleString()} so'm</TableCell>
                            <TableCell className="hidden md:table-cell">
                                <Badge variant={
                                    order.status === 'paid' ? 'success' :
                                    order.status === 'completed' ? 'success' :
                                    order.status === 'cancelled' ? 'destructive' :
                                    order.status === 'pending' ? 'warning' :
                                    order.status === 'ready' ? 'info' :
                                    order.status === 'new' ? 'secondary' :
                                    'outline'
                                }>
                                {order.status_display || 'N/A'}
                                </Badge>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-right">
                                {new Date(order.created_at).toLocaleString('uz-UZ', { dateStyle: 'short', timeStyle: 'short' })}
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <ChevronDown className="h-4 w-4" />
                                    <span className="sr-only">Amallar</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleShowOrderDetails(order.id)}>Batafsil</DropdownMenuItem>
                                    <DropdownMenuItem onClick={async () => {
                                        const headers = getAuthHeader(router);
                                        if (!headers) return;
                                        setIsLoadingOrderDetails(true);
                                        try {
                                            const response = await axios.get(`https://oshxonacopy.pythonanywhere.com/api/orders/${order.id}/`, { headers });
                                            printReceipt(response.data);
                                        } catch (err) {
                                            handleApiError(err, `Buyurtma #${order.id} tafsilotlarini chop etish uchun olishda`);
                                            toast.error("Chekni chop etish uchun ma'lumotlar yuklanmadi.");
                                        } finally {
                                           setIsLoadingOrderDetails(false);
                                        }
                                    }}>
                                    Chek chop etish
                                    </DropdownMenuItem>
                                    {/* === BEKOR QILISH BANDI === */}
                                    {(order.status === 'pending' || order.status === 'processing' || order.status === 'ready' || order.status === 'new') && (
                                    <DropdownMenuItem
                                        onClick={() => {
                                          if (confirm(`Haqiqatan ham #${order.id} raqamli buyurtmani bekor qilmoqchimisiz? Bu amalni qaytarib bo'lmaydi.`)) {
                                             handleCancelOrder(order.id);
                                          }
                                        }}
                                        className="text-red-600 focus:text-red-700 focus:bg-red-100 dark:focus:bg-red-900/50 dark:focus:text-red-400"
                                    >
                                        <X className="mr-2 h-4 w-4"/>
                                        Bekor qilish
                                    </DropdownMenuItem>
                                    )}
                                    {/* === BEKOR QILISH BANDI YAKUNI === */}
                                </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                            </TableRow>
                        ))
                       ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                            Buyurtmalar topilmadi.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
                <CardFooter className="flex justify-center pt-4">
                  {!showAllOrders && validOrders.length > 5 && (
                    <Button variant="link" onClick={() => setShowAllOrders(true)}>
                      Barchasini ko'rish ({validOrders.length})
                    </Button>
                  )}
                  {showAllOrders && (
                    <Button variant="link" onClick={() => setShowAllOrders(false)}>
                      Kamroq ko'rish
                    </Button>
                  )}
                </CardFooter>
              </Card>
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === "orders" && (
            <div className="space-y-6">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <h2 className="text-2xl font-bold tracking-tight">Buyurtmalar</h2>
                <Button variant="ghost" onClick={refreshOrders}>
                  <Paperclip className="mr-2 h-4 w-4" /> Yangilash
                </Button>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Buyurtmalar ro'yxati</CardTitle>
                  <CardDescription>Barcha buyurtmalar va ularning holati.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">ID</TableHead>
                        <TableHead>Mijoz</TableHead>
                        <TableHead className="hidden sm:table-cell">Turi</TableHead>
                        <TableHead className="text-right">Jami</TableHead>
                        <TableHead className="hidden md:table-cell">Holat</TableHead>
                        <TableHead className="hidden lg:table-cell text-right">Sana</TableHead>
                        <TableHead className="text-right w-[100px]">Amallar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validOrders.length > 0 ? (
                        validOrders.map((order) => (
                            <TableRow key={order.id}>
                            <TableCell className="font-medium">#{order.id}</TableCell>
                            <TableCell>{order.customer_name || "Noma'lum"}</TableCell>
                            <TableCell className="hidden sm:table-cell">{order.order_type_display || 'N/A'}</TableCell>
                            <TableCell className="text-right">{parseFloat(order.final_price || 0).toLocaleString()} so'm</TableCell>
                            <TableCell className="hidden md:table-cell">
                                <Badge variant={
                                    order.status === 'paid' ? 'success' :
                                    order.status === 'completed' ? 'success' :
                                    order.status === 'cancelled' ? 'destructive' :
                                    order.status === 'pending' ? 'warning' :
                                    order.status === 'ready' ? 'info' :
                                    order.status === 'new' ? 'secondary' :
                                    'outline'
                                }>
                                {order.status_display || 'N/A'}
                                </Badge>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-right">
                                {new Date(order.created_at).toLocaleString('uz-UZ', { dateStyle: 'short', timeStyle: 'short' })}
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <ChevronDown className="h-4 w-4" />
                                    <span className="sr-only">Amallar</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleShowOrderDetails(order.id)}>Batafsil</DropdownMenuItem>
                                    <DropdownMenuItem onClick={async () => {
                                        const headers = getAuthHeader(router);
                                        if (!headers) return;
                                        setIsLoadingOrderDetails(true);
                                        try {
                                            const response = await axios.get(`https://oshxonacopy.pythonanywhere.com/api/orders/${order.id}/`, { headers });
                                            printReceipt(response.data);
                                        } catch (err) {
                                            handleApiError(err, `Buyurtma #${order.id} tafsilotlarini chop etish uchun olishda`);
                                            toast.error("Chekni chop etish uchun ma'lumotlar yuklanmadi.");
                                        } finally {
                                            setIsLoadingOrderDetails(false);
                                        }
                                    }}>
                                    Chek chop etish
                                    </DropdownMenuItem>
                                     {/* === BEKOR QILISH BANDI === */}
                                    {(order.status === 'pending' || order.status === 'processing' || order.status === 'ready' || order.status === 'new') && (
                                        <DropdownMenuItem
                                            onClick={() => {
                                              if (confirm(`Haqiqatan ham #${order.id} raqamli buyurtmani bekor qilmoqchimisiz? Bu amalni qaytarib bo'lmaydi.`)) {
                                                 handleCancelOrder(order.id);
                                              }
                                            }}
                                            className="text-red-600 focus:text-red-700 focus:bg-red-100 dark:focus:bg-red-900/50 dark:focus:text-red-400"
                                        >
                                            <X className="mr-2 h-4 w-4"/>
                                            Bekor qilish
                                        </DropdownMenuItem>
                                    )}
                                    {/* === BEKOR QILISH BANDI YAKUNI === */}
                                </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                            </TableRow>
                        ))
                       ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                            Buyurtmalar topilmadi.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Products Tab */}
          {activeTab === "products" && (
            <div className="space-y-6">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <h2 className="text-2xl font-bold tracking-tight">Mahsulotlar</h2>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={refreshProducts}>
                      <Paperclip className="mr-2 h-4 w-4" /> Yangilash
                    </Button>
                    <Button onClick={() => setShowAddProductDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Yangi mahsulot qo'shish
                    </Button>
                </div>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Mahsulotlar ro'yxati</CardTitle>
                  <CardDescription>Barcha mavjud mahsulotlar va ularning narxlari.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mahsulot nomi</TableHead>
                        <TableHead className="text-right">Narx</TableHead>
                        <TableHead className="hidden sm:table-cell">Kategoriya</TableHead>
                        <TableHead className="hidden md:table-cell text-right">Tannarx</TableHead>
                        <TableHead className="text-right">Holat</TableHead>
                        <TableHead className="text-right">Amallar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validProducts.length > 0 ? (
                        validProducts.map((product) => (
                            <TableRow key={product.id}>
                            <TableCell className="font-medium flex items-center gap-2">
                                <img
                                src={product.image || "/placeholder-product.jpg"}
                                alt={product.name || "Mahsulot"}
                                className="w-8 h-8 rounded-sm object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder-product.jpg"; }} // Type assertion
                                />
                                <span>{product.name || "Noma'lum"}</span>
                            </TableCell>
                            <TableCell className="text-right">{(product.price || 0).toLocaleString()} so'm</TableCell>
                            <TableCell className="hidden sm:table-cell">{product.category?.name || "N/A"}</TableCell>
                            <TableCell className="hidden md:table-cell text-right">{(product.cost_price || 0).toLocaleString()} so'm</TableCell>
                            <TableCell className="text-right">
                                <Badge variant={product.is_active ? "success" : "destructive"}>
                                {product.is_active ? "Faol" : "Faol emas"}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <ChevronDown className="h-4 w-4" />
                                    <span className="sr-only">Amallar</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {/* === MAHSULOT TAHRIRLASH BANDI === */}
                                    <DropdownMenuItem onClick={() => handleEditProductClick(product)}>
                                        <Edit className="mr-2 h-4 w-4"/> Tahrirlash
                                    </DropdownMenuItem>
                                    {/* === MAHSULOT TAHRIRLASH BANDI YAKUNI === */}
                                    <DropdownMenuItem onClick={() => handleDeleteProduct(product)} className="text-red-600 focus:text-red-700 focus:bg-red-100 dark:focus:bg-red-900/50 dark:focus:text-red-400">
                                    O'chirish
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                            </TableRow>
                         ))
                       ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                            Mahsulotlar topilmadi.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Employees Tab */}
          {activeTab === "employees" && (
            <div className="space-y-6">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <h2 className="text-2xl font-bold tracking-tight">Xodimlar</h2>
                 <div className="flex gap-2">
                    <Button variant="ghost" onClick={refreshEmployees}>
                        <Paperclip className="mr-2 h-4 w-4" /> Yangilash
                    </Button>
                    <Button onClick={() => setShowAddEmployeeDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Yangi xodim qo'shish
                    </Button>
                 </div>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Xodimlar ro'yxati</CardTitle>
                  <CardDescription>Barcha xodimlar va ularning rollari.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ism</TableHead>
                        <TableHead className="hidden sm:table-cell">Username</TableHead>
                        <TableHead className="hidden md:table-cell">Rol</TableHead>
                        <TableHead className="text-right">Holat</TableHead>
                        <TableHead className="text-right">Amallar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validXodim.length > 0 ? (
                        validXodim.map((employee) => (
                            <TableRow key={employee.id}>
                            <TableCell className="font-medium">{employee.first_name} {employee.last_name}</TableCell>
                            <TableCell className="hidden sm:table-cell">{employee.username || "N/A"}</TableCell>
                            <TableCell className="hidden md:table-cell">{employee.role?.name || "N/A"}</TableCell>
                            <TableCell className="text-right">
                                <Badge variant={employee.is_active ? "success" : "destructive"}>
                                {employee.is_active ? "Faol" : "Faol emas"}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <ChevronDown className="h-4 w-4" />
                                    <span className="sr-only">Amallar</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleEditEmployeeClick(employee)}>
                                      <Edit className="mr-2 h-4 w-4" /> Tahrirlash
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDeleteEmployee(employee)} className="text-red-600 focus:text-red-700 focus:bg-red-100 dark:focus:bg-red-900/50 dark:focus:text-red-400">
                                    O'chirish
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                            </TableRow>
                        ))
                       ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                            Xodimlar topilmadi.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Roles Tab */}
          {activeTab === "roles" && (
            <div className="space-y-6">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <h2 className="text-2xl font-bold tracking-tight">Rollar</h2>
                 <div className="flex gap-2">
                    <Button variant="ghost" onClick={refreshRoles}>
                      <Paperclip className="mr-2 h-4 w-4" /> Yangilash
                    </Button>
                    <Button onClick={() => setShowAddRoleDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Yangi rol qo'shish
                    </Button>
                 </div>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Rollar ro'yxati</CardTitle>
                  <CardDescription>Tizimdagi barcha rollar va ularga biriktirilgan xodimlar soni.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rol nomi</TableHead>
                        <TableHead className="text-right">Xodimlar soni</TableHead>
                        <TableHead className="text-right">Amallar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validRolesList.length > 0 ? (
                        validRolesList.map((role) => (
                            <TableRow key={role.id}>
                            <TableCell className="font-medium">{role.name || "Noma'lum"}</TableCell>
                            <TableCell className="text-right">{role.employee_count ?? 0}</TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <ChevronDown className="h-4 w-4" />
                                    <span className="sr-only">Amallar</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleEditRoleClick(role)}>
                                      <Edit className="mr-2 h-4 w-4" /> Tahrirlash
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDeleteRole(role)} className="text-red-600 focus:text-red-700 focus:bg-red-100 dark:focus:bg-red-900/50 dark:focus:text-red-400" disabled={role.employee_count > 0 || (role.count && role.count > 0)}>
                                    O'chirish
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                            </TableRow>
                        ))
                       ) : (
                        <TableRow>
                          <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                            Rollar topilmadi.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* --- YANGI: Categories Tab --- */}
          {activeTab === "categories" && (
            <div className="space-y-6">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <h2 className="text-2xl font-bold tracking-tight">Kategoriyalar</h2>
                 <div className="flex gap-2">
                    <Button variant="ghost" onClick={refreshCategories}>
                      <Paperclip className="mr-2 h-4 w-4" /> Yangilash
                    </Button>
                    <Button onClick={() => setShowAddCategoryDialog(true)}>
                      <Plus className="mr-2 h-4 w-4" /> Yangi kategoriya qo'shish
                    </Button>
                 </div>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Kategoriyalar ro'yxati</CardTitle>
                  <CardDescription>Mahsulotlar guruhlanadigan barcha kategoriyalar.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">ID</TableHead>
                        <TableHead>Kategoriya nomi</TableHead>
                        {/* Slug backend tomonidan avtomatik yaratilganligi uchun ko'rsatish shart emas */}
                        {/* <TableHead className="hidden sm:table-cell">Slug</TableHead> */}
                        <TableHead className="text-right">Amallar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validCategories.length > 0 ? (
                        validCategories.map((category) => (
                            <TableRow key={category.id}>
                            <TableCell className="font-medium">{category.id}</TableCell>
                            <TableCell>{category.name || "Noma'lum"}</TableCell>
                            {/* <TableCell className="hidden sm:table-cell">{category.slug || "N/A"}</TableCell> */}
                            <TableCell className="text-right">
                                <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <ChevronDown className="h-4 w-4" />
                                    <span className="sr-only">Amallar</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleEditCategoryClick(category)}>
                                      <Edit className="mr-2 h-4 w-4" /> Tahrirlash
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDeleteCategoryClick(category)} className="text-red-600 focus:text-red-700 focus:bg-red-100 dark:focus:bg-red-900/50 dark:focus:text-red-400">
                                      O'chirish
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                            </TableRow>
                        ))
                       ) : (
                        <TableRow>
                          <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                            Kategoriyalar topilmadi.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
          {/* --- Kategoriyalar Tab Yakuni --- */}

          {/* Reports Tab */}
          {activeTab === "reports" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold tracking-tight">Hisobotlar</h2>
              <Tabs defaultValue="employees" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="employees">Xodimlar bo'yicha</TabsTrigger>
                  <TabsTrigger value="products">Mahsulotlar bo'yicha</TabsTrigger>
                  <TabsTrigger value="customers">Mijozlar bo'yicha</TabsTrigger>
                  <TabsTrigger value="charts">Diagrammalar</TabsTrigger>
                </TabsList>

                {/* Hisobotlar > Xodimlar */}
                <TabsContent value="employees" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Xodimlar bo'yicha hisobot</CardTitle>
                      <CardDescription>Xodimlarning faoliyati va savdo ko'rsatkichlari.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Xodim</TableHead>
                            <TableHead className="text-right">Buyurtmalar soni</TableHead>
                            <TableHead className="text-right">Umumiy savdo</TableHead>
                            <TableHead className="text-right hidden md:table-cell">O'rtacha chek</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {validEmployeeReport.length > 0 ? (
                            validEmployeeReport.map((report, index) => (
                                <TableRow key={report.employee_id || index}>
                                <TableCell className="font-medium">{report.employee_name || "Noma'lum"}</TableCell>
                                <TableCell className="text-right">{report.orders_count ?? 0}</TableCell>
                                <TableCell className="text-right">{(report.total_sales ?? 0).toLocaleString()} so'm</TableCell>
                                <TableCell className="text-right hidden md:table-cell">{(report.average_check ?? 0).toLocaleString()} so'm</TableCell>
                                </TableRow>
                            ))
                           ) : (
                            <TableRow>
                              <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                Hisobot ma'lumotlari topilmadi.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Hisobotlar > Mahsulotlar */}
                <TabsContent value="products" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Mahsulotlar bo'yicha hisobot</CardTitle>
                      <CardDescription>Mahsulotlarning sotilish statistikasi.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Mahsulot</TableHead>
                            <TableHead className="text-right">Sotilgan miqdor</TableHead>
                            <TableHead className="text-right">Umumiy savdo</TableHead>
                            <TableHead className="text-right hidden md:table-cell">Foyda</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {validProductReportData.length > 0 ? (
                            validProductReportData.map((product, index) => (
                                <TableRow key={product.product_id || index}>
                                <TableCell className="font-medium">{product.product_name || "Noma'lum"}</TableCell>
                                <TableCell className="text-right">{product.sold_quantity ?? 0}</TableCell>
                                <TableCell className="text-right">{(product.sales_revenue ?? 0).toLocaleString()} so'm</TableCell>
                                <TableCell className="text-right hidden md:table-cell">{(product.profit ?? 0).toLocaleString()} so'm</TableCell>
                                </TableRow>
                            ))
                           ) : (
                            <TableRow>
                              <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                Hisobot ma'lumotlari topilmadi.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Hisobotlar > Mijozlar */}
                <TabsContent value="customers" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Mijozlar bo'yicha hisobot</CardTitle>
                      <CardDescription>Mijoz turlarining buyurtmalari va xarid statistikasi.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Mijoz turi</TableHead>
                            <TableHead className="text-right">Buyurtmalar soni</TableHead>
                            <TableHead className="text-right">Umumiy xarid</TableHead>
                            <TableHead className="text-right hidden md:table-cell">O'rtacha chek</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {validCustomerReport.length > 0 ? (
                             validCustomerReport.map((report, index) => (
                                <TableRow key={report.customer_type ? report.customer_type + index : index}>
                                <TableCell className="font-medium">{report.customer_type || "Noma'lum"}</TableCell>
                                <TableCell className="text-right">{report.orders_count ?? 0}</TableCell>
                                <TableCell className="text-right">{(report.total_sales ?? 0).toLocaleString()} so'm</TableCell>
                                <TableCell className="text-right hidden md:table-cell">{(report.average_check ?? 0).toLocaleString()} so'm</TableCell>
                                </TableRow>
                            ))
                           ) : (
                            <TableRow>
                              <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                Mijozlar bo'yicha hisobot ma'lumotlari topilmadi.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Hisobotlar > Diagrammalar */}
                <TabsContent value="charts" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>To'lov usullari bo'yicha</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {isClient && validPaymentMethods.length > 0 ? (
                          <div className="h-[300px] w-full">
                            <Chart
                              options={{
                                chart: { type: 'pie', background: 'transparent' },
                                theme: { mode: typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light' },
                                labels: validPaymentMethods.map(method => method.method_display || 'Noma\'lum'),
                                colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#f472b6', '#6b7280'],
                                legend: { position: 'bottom', labels: { colors: '#9ca3af' } },
                                tooltip: {
                                  theme: typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light',
                                  y: { formatter: (value) => `${value} ta buyurtma` }
                                },
                                dataLabels: {
                                  enabled: true,
                                  formatter: (val, opts) => {
                                      const name = opts.w.globals.labels[opts.seriesIndex];
                                      return val > 5 ? `${name}: ${val.toFixed(1)}%` : `${val.toFixed(1)}%`;
                                  },
                                  style: { fontSize: '11px', fontWeight: 'bold', colors: ["#fff"] },
                                  dropShadow: { enabled: true, top: 1, left: 1, blur: 1, color: '#000', opacity: 0.45 }
                                }
                              }}
                              series={validPaymentMethods.map(method => method.count || 0)}
                              type="pie"
                              height="100%"
                              width="100%"
                            />
                          </div>
                        ) : (
                          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                            {isClient ? "To'lov usullari bo'yicha ma'lumot yo'q." : "Yuklanmoqda..."}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle>Buyurtma turlari bo'yicha</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {isClient && validOrderTypes.length > 0 ? (
                          <div className="h-[300px] w-full">
                            <Chart
                              options={{
                                chart: { type: 'donut', background: 'transparent' },
                                theme: { mode: typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light' },
                                labels: validOrderTypes.map(type => type.type_display || 'Noma\'lum'),
                                colors: ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#f472b6', '#6b7280'],
                                legend: { position: 'bottom', labels: { colors: '#9ca3af' } },
                                tooltip: {
                                  theme: typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light',
                                  y: { formatter: (value) => `${value} ta buyurtma` }
                                },
                                dataLabels: {
                                  enabled: true,
                                  formatter: (val, opts) => {
                                      const name = opts.w.globals.labels[opts.seriesIndex];
                                      return val > 5 ? `${name}: ${val.toFixed(1)}%` : `${val.toFixed(1)}%`;
                                  },
                                   style: { fontSize: '11px', fontWeight: 'bold', colors: ["#fff"] },
                                   dropShadow: { enabled: true, top: 1, left: 1, blur: 1, color: '#000', opacity: 0.45 }
                                }
                              }}
                              series={validOrderTypes.map(type => type.count || 0)}
                              type="donut"
                              height="100%"
                              width="100%"
                            />
                          </div>
                        ) : (
                          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                            {isClient ? "Buyurtma turlari bo'yicha ma'lumot yo'q." : "Yuklanmoqda..."}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold tracking-tight">Sozlamalar</h2>
              <Card>
                <CardHeader>
                  <CardTitle>Restoran sozlamalari</CardTitle>
                  <CardDescription>Restoran ma'lumotlarini bu yerda o'zgartirishingiz mumkin.</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingSettings ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
                    </div>
                  ) : settingsError ? (
                    <div className="py-10 text-center text-red-600 dark:text-red-400">
                      {settingsError}
                    </div>
                  ) : (
                    <form onSubmit={(e) => { e.preventDefault(); handleUpdateSettings(); }} className="space-y-6">
                      <div className="grid gap-4 md:grid-cols-2">
                         <div className="space-y-2">
                            <Label htmlFor="settings-name">Restoran nomi*</Label>
                            <Input
                                id="settings-name"
                                value={settings.name || ""}
                                onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                                placeholder="Restoran nomi"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="settings-description">Tavsif</Label>
                            <Input
                                id="settings-description"
                                value={settings.description || ""}
                                onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                                placeholder="Qisqacha tavsif"
                            />
                        </div>
                      </div>

                       <div className="space-y-2">
                        <Label htmlFor="settings-address">Manzil</Label>
                        <Input
                          id="settings-address"
                          value={settings.address || ""}
                          onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                          placeholder="Manzil"
                          maxLength={100}
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="settings-phone">Telefon raqami</Label>
                            <Input
                            id="settings-phone"
                            value={settings.phone || ""}
                            onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                            placeholder="+998 XX XXX XX XX"
                            maxLength={20}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="settings-email">Email</Label>
                            <Input
                            id="settings-email"
                            type="email"
                            value={settings.email || ""}
                            onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                            placeholder="info@example.com"
                            maxLength={254}
                            />
                        </div>
                      </div>

                     <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label htmlFor="settings-currency_symbol">Valyuta belgisi</Label>
                            <Input
                            id="settings-currency_symbol"
                            value={settings.currency_symbol || ""}
                            onChange={(e) => setSettings({ ...settings, currency_symbol: e.target.value })}
                            placeholder="so'm"
                            maxLength={10}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="settings-tax_percent">Soliq stavkasi (%)</Label>
                            <Input
                            id="settings-tax_percent"
                            type="number"
                            value={settings.tax_percent ?? ''} // Use empty string if null/undefined for controlled input
                            onChange={(e) => setSettings({ ...settings, tax_percent: e.target.value === '' ? null : parseFloat(e.target.value) })}
                            placeholder="0"
                            min="0"
                            max="100"
                            step="0.01"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="settings-service_fee_percent">Xizmat haqi (%)</Label>
                            <Input
                            id="settings-service_fee_percent"
                            type="number"
                            value={settings.service_fee_percent ?? ''} // Use empty string if null/undefined
                            onChange={(e) => setSettings({ ...settings, service_fee_percent: e.target.value === '' ? null : parseFloat(e.target.value) })}
                            placeholder="10"
                            min="0"
                            max="100"
                            step="0.1"
                            />
                        </div>
                     </div>

                      <div className="flex justify-end">
                        <Button type="submit">Saqlash</Button> {/* Use type="submit" */}
                      </div>
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* --- Dialogs --- */}

      {/* Add Employee Dialog */}
      <Dialog open={showAddEmployeeDialog} onOpenChange={setShowAddEmployeeDialog}>
        <DialogContent className="sm:max-w-[425px]">
         <form onSubmit={(e) => { e.preventDefault(); handleAddEmployee(); }}>
          <DialogHeader>
            <DialogTitle>Yangi xodim qo'shish</DialogTitle>
            <DialogDescription>Xodim ma'lumotlarini kiriting.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="add-username" className="text-right">Username*</Label>
              <Input
                id="add-username"
                value={newEmployee.username}
                onChange={(e) => setNewEmployee({ ...newEmployee, username: e.target.value })}
                className="col-span-3"
                placeholder="Username"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="add-first_name" className="text-right">Ism*</Label>
              <Input
                id="add-first_name"
                value={newEmployee.first_name}
                onChange={(e) => setNewEmployee({ ...newEmployee, first_name: e.target.value })}
                className="col-span-3"
                placeholder="Ism"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="add-last_name" className="text-right">Familiya*</Label>
              <Input
                id="add-last_name"
                value={newEmployee.last_name}
                onChange={(e) => setNewEmployee({ ...newEmployee, last_name: e.target.value })}
                className="col-span-3"
                placeholder="Familiya"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="add-role_id" className="text-right">Rol*</Label>
              <Select
                value={newEmployee.role_id}
                onValueChange={(value) => setNewEmployee({ ...newEmployee, role_id: value })}
                required
              >
                <SelectTrigger className="col-span-3" id="add-role_id">
                  <SelectValue placeholder="Rolni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {validFetchedRoles.length > 0 ? validFetchedRoles.map((role) => (
                    <SelectItem key={role.id} value={role.id.toString()}>
                      {role.name || "Noma'lum"}
                    </SelectItem>
                  )) : <SelectItem value="" disabled>Rollar topilmadi</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="add-pin_code" className="text-right">PIN-kod*</Label>
              <Input
                id="add-pin_code"
                type="password" // Use password type for masking
                pattern="\d{4}"
                value={newEmployee.pin_code}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setNewEmployee({ ...newEmployee, pin_code: value });
                }}
                className="col-span-3"
                placeholder="4 raqamli PIN"
                maxLength={4}
                required
                autoComplete="new-password" // Prevent browser autofill issues
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="add-is_active" className="text-right">Faol</Label>
              <div className="col-span-3 flex items-center">
                <input
                  id="add-is_active"
                  type="checkbox"
                  checked={newEmployee.is_active}
                  onChange={(e) => setNewEmployee({ ...newEmployee, is_active: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowAddEmployeeDialog(false)}>Bekor qilish</Button>
            <Button type="submit">Qo'shish</Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

       {/* Edit Employee Dialog */}
       <Dialog open={showEditEmployeeDialog} onOpenChange={setShowEditEmployeeDialog}>
        <DialogContent className="sm:max-w-[425px]">
         <form onSubmit={(e) => { e.preventDefault(); handleUpdateEmployee(); }}>
          <DialogHeader>
            <DialogTitle>Xodimni tahrirlash</DialogTitle>
            <DialogDescription>Xodim ma'lumotlarini o'zgartiring. PIN-kodni yangilash majburiy.</DialogDescription>
          </DialogHeader>
          {isLoadingEmployeeDetails ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
            </div>
          ) : editingEmployee ? (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-username" className="text-right">Username*</Label>
                <Input
                  id="edit-username"
                  value={editingEmployee.username || ''}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, username: e.target.value })}
                  className="col-span-3"
                  placeholder="Username"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-first_name" className="text-right">Ism*</Label>
                <Input
                  id="edit-first_name"
                  value={editingEmployee.first_name || ''}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, first_name: e.target.value })}
                  className="col-span-3"
                  placeholder="Ism"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-last_name" className="text-right">Familiya*</Label>
                <Input
                  id="edit-last_name"
                  value={editingEmployee.last_name || ''}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, last_name: e.target.value })}
                  className="col-span-3"
                  placeholder="Familiya"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-role_id" className="text-right">Rol*</Label>
                <Select
                  value={editingEmployee.role_id?.toString() || ''}
                  onValueChange={(value) => setEditingEmployee({ ...editingEmployee, role_id: value })}
                  required
                >
                  <SelectTrigger className="col-span-3" id="edit-role_id">
                    <SelectValue placeholder="Rolni tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    {validFetchedRoles.length > 0 ? validFetchedRoles.map((role) => (
                      <SelectItem key={role.id} value={role.id.toString()}>
                        {role.name || "Noma'lum"}
                      </SelectItem>
                    )) : <SelectItem value="" disabled>Rollar topilmadi</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-pin_code" className="text-right">Yangi PIN*</Label>
                <Input
                  id="edit-pin_code"
                  type="password"
                  pattern="\d{4}"
                  value={editingEmployee.pin_code || ''} // PIN-kod maydoni
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setEditingEmployee({ ...editingEmployee, pin_code: value });
                  }}
                  className="col-span-3"
                  placeholder="Yangi 4 raqamli PIN"
                  maxLength={4}
                  required // Tahrirlashda PIN majburiy
                  autoComplete="new-password"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-is_active" className="text-right">Faol</Label>
                <div className="col-span-3 flex items-center">
                  <input
                    id="edit-is_active"
                    type="checkbox"
                    checked={editingEmployee.is_active}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, is_active: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>
          ) : (
              <div className="text-center py-10 text-muted-foreground">Xodim ma'lumotlari topilmadi.</div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowEditEmployeeDialog(false)}>Bekor qilish</Button>
            <Button type="submit" disabled={isLoadingEmployeeDetails || !editingEmployee}>Saqlash</Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>


      {/* Add Role Dialog */}
      <Dialog open={showAddRoleDialog} onOpenChange={setShowAddRoleDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={(e) => { e.preventDefault(); handleAddRole(); }}>
              <DialogHeader>
                <DialogTitle>Yangi rol qo'shish</DialogTitle>
                <DialogDescription>Rol nomini kiriting.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="role_name" className="text-right">Rol nomi*</Label>
                  <Input
                    id="role_name"
                    value={newRole.name}
                    onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                    className="col-span-3"
                    placeholder="Masalan: Kassir"
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowAddRoleDialog(false)}>Bekor qilish</Button>
                <Button type="submit">Qo'shish</Button>
              </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Role Confirmation Dialog */}
      <Dialog open={isDeleteRoleConfirmOpen} onOpenChange={setIsDeleteRoleConfirmOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Rolni o'chirishni tasdiqlang</DialogTitle>
            <DialogDescription>
              Haqiqatan ham <strong>"{roleToDelete?.name || 'Noma\'lum'}"</strong> rolini o'chirishni xohlaysizmi? Bu amalni qaytarib bo'lmaydi.
              {roleToDelete?.employee_count > 0 && (
                <span className="block mt-2 text-red-600 dark:text-red-400 font-semibold">
                  Diqqat: Bu rolga {roleToDelete.employee_count} ta xodim biriktirilgan. Rolni o'chirish uchun avval xodimlarni boshqa rolga o'tkazing yoki xodimlarni o'chiring.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsDeleteRoleConfirmOpen(false); setRoleToDelete(null); }}>
              Bekor qilish
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteRole}
              disabled={roleToDelete?.employee_count > 0} // Disable delete if employees assigned
            >
              O'chirish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Product Dialog */}
      <Dialog open={showAddProductDialog} onOpenChange={setShowAddProductDialog}>
        <DialogContent className="sm:max-w-[425px]">
         <form onSubmit={(e) => { e.preventDefault(); handleAddProduct(); }}>
          <DialogHeader>
            <DialogTitle>Yangi mahsulot qo'shish</DialogTitle>
            <DialogDescription>Mahsulot ma'lumotlarini kiriting.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="product_name" className="text-right">Nomi*</Label>
              <Input
                id="product_name"
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                className="col-span-3"
                placeholder="Masalan: Osh"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="price" className="text-right">Narx*</Label>
              <Input
                id="price"
                type="number"
                value={newProduct.price}
                onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                className="col-span-3"
                placeholder="Narx (so'mda)"
                min="0"
                step="100"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cost_price" className="text-right">Tannarx</Label>
              <Input
                id="cost_price"
                type="number"
                value={newProduct.cost_price}
                onChange={(e) => setNewProduct({ ...newProduct, cost_price: e.target.value })}
                className="col-span-3"
                placeholder="Tannarx (ixtiyoriy)"
                min="0"
                step="100"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category_id" className="text-right">Kategoriya*</Label>
              <Select
                value={newProduct.category_id}
                onValueChange={(value) => setNewProduct({ ...newProduct, category_id: value })}
                required
              >
                <SelectTrigger className="col-span-3" id="category_id">
                  <SelectValue placeholder="Kategoriyani tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {/* --- Kategoriya Select yangilandi --- */}
                  {validCategories.length > 0 ? validCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name || "Noma'lum"}
                    </SelectItem>
                  )) : <SelectItem value="" disabled>Kategoriyalar yo'q</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">Tavsif</Label>
              <Input
                id="description"
                value={newProduct.description}
                onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                className="col-span-3"
                placeholder="Mahsulot haqida qisqacha"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="image" className="text-right">Rasm</Label>
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={(e) => setNewProduct({ ...newProduct, image: e.target.files ? e.target.files[0] : null })}
                className="col-span-3 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="product_is_active" className="text-right">Faol</Label> {/* Unique ID */}
              <div className="col-span-3 flex items-center">
                <input
                  id="product_is_active"
                  type="checkbox"
                  checked={newProduct.is_active}
                  onChange={(e) => setNewProduct({ ...newProduct, is_active: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowAddProductDialog(false)}>Bekor qilish</Button>
            <Button type="submit">Qo'shish</Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================== */}
      {/* ------ MAHSULOT TAHRIRLASH MODALI ------ */}
      {/* ========================================================== */}
      <Dialog open={showEditProductDialog} onOpenChange={setShowEditProductDialog}>
        <DialogContent className="sm:max-w-[425px]">
         <form onSubmit={(e) => { e.preventDefault(); handleUpdateProduct(); }}>
          <DialogHeader>
            <DialogTitle>Mahsulotni tahrirlash</DialogTitle>
            <DialogDescription>Mahsulot ma'lumotlarini o'zgartiring.</DialogDescription>
          </DialogHeader>
          {isLoadingProductDetails ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
            </div>
          ) : editingProduct ? (
            <div className="grid gap-4 py-4">
              {/* Nomi */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-product_name" className="text-right">Nomi*</Label>
                <Input
                  id="edit-product_name"
                  value={editingProduct.name || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="col-span-3"
                  placeholder="Masalan: Osh"
                  required
                />
              </div>
              {/* Narx */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-price" className="text-right">Narx*</Label>
                <Input
                  id="edit-price"
                  type="number"
                  value={editingProduct.price || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value })}
                  className="col-span-3"
                  placeholder="Narx (so'mda)"
                  min="0"
                  step="100"
                  required
                />
              </div>
              {/* Tannarx */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-cost_price" className="text-right">Tannarx</Label>
                <Input
                  id="edit-cost_price"
                  type="number"
                  value={editingProduct.cost_price || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, cost_price: e.target.value })}
                  className="col-span-3"
                  placeholder="Tannarx (ixtiyoriy)"
                  min="0"
                  step="100"
                />
              </div>
              {/* Kategoriya */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-category_id" className="text-right">Kategoriya*</Label>
                <Select
                  value={editingProduct.category_id || ''}
                  onValueChange={(value) => setEditingProduct({ ...editingProduct, category_id: value })}
                  required
                >
                  <SelectTrigger className="col-span-3" id="edit-category_id">
                    <SelectValue placeholder="Kategoriyani tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* --- Kategoriya Select yangilandi --- */}
                    {validCategories.length > 0 ? validCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name || "Noma'lum"}
                      </SelectItem>
                    )) : <SelectItem value="" disabled>Kategoriyalar yo'q</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              {/* Tavsif */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-description" className="text-right">Tavsif</Label>
                <Input
                  id="edit-description"
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="col-span-3"
                  placeholder="Mahsulot haqida qisqacha"
                />
              </div>
              {/* Rasm */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-image" className="text-right">Rasm</Label>
                <div className="col-span-3 space-y-2">
                    {/* Mavjud rasmni ko'rsatish (agar bo'lsa) */}
                    {editingProduct.image && typeof editingProduct.image === 'string' && (
                         <img src={editingProduct.image} alt="Mavjud rasm" className="h-16 w-16 object-cover rounded-md"/>
                    )}
                     {/* Yangi rasm tanlash */}
                    <Input
                        id="edit-image"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                            const file = e.target.files ? e.target.files[0] : null;
                            setEditingProduct({ ...editingProduct, newImage: file }); // Yangi rasmni 'newImage' ga saqlash
                        }}
                        className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"
                    />
                     <p className="text-xs text-muted-foreground">Yangi rasm tanlang (ixtiyoriy).</p>
                </div>
              </div>
              {/* Faol holati */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-product_is_active" className="text-right">Faol</Label>
                <div className="col-span-3 flex items-center">
                  <input
                    id="edit-product_is_active"
                    type="checkbox"
                    checked={editingProduct.is_active}
                    onChange={(e) => setEditingProduct({ ...editingProduct, is_active: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>
          ) : (
             <div className="text-center py-10 text-muted-foreground">Mahsulot ma'lumotlari topilmadi.</div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowEditProductDialog(false)}>Bekor qilish</Button>
            <Button type="submit" disabled={isLoadingProductDetails || isUpdatingProduct || !editingProduct}>
                {isUpdatingProduct && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Saqlash
            </Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* ========================================================== */}
      {/* ------ MAHSULOT TAHRIRLASH MODALI YAKUNI ------ */}
      {/* ========================================================== */}


      {/* Order Details Modal */}
      <Dialog open={showOrderDetailsModal} onOpenChange={handleModalClose}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Buyurtma #{selectedOrderDetails?.id || '...'}</DialogTitle>
            <DialogDescription>Buyurtma haqida batafsil ma'lumot.</DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-grow basis-0 px-6 py-4">
            {isLoadingOrderDetails ? (
                <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
                </div>
            ) : orderDetailsError ? (
                <div className="text-center text-red-600 dark:text-red-400">
                    {orderDetailsError}
                </div>
            ) : selectedOrderDetails ? (
                <div className="space-y-4">
                    {/* Asosiy ma'lumotlar */}
                    <div className="grid gap-x-4 gap-y-2 grid-cols-1 sm:grid-cols-2">
                        <div><p className="text-xs text-muted-foreground">ID</p><p className="text-sm font-medium">{selectedOrderDetails.id}</p></div>
                        <div><p className="text-xs text-muted-foreground">Buyurtma turi</p><p className="text-sm font-medium">{selectedOrderDetails.order_type_display || selectedOrderDetails.order_type || 'N/A'}</p></div>
                        <div><p className="text-xs text-muted-foreground">Holat</p><Badge variant={ selectedOrderDetails.status === 'paid' ? 'success' : selectedOrderDetails.status === 'completed' ? 'success' : selectedOrderDetails.status === 'cancelled' ? 'destructive' : selectedOrderDetails.status === 'pending' ? 'warning' : selectedOrderDetails.status === 'ready' ? 'info' : selectedOrderDetails.status === 'new' ? 'secondary' : 'outline' }>{selectedOrderDetails.status_display || selectedOrderDetails.status || 'N/A'}</Badge></div>
                        <div><p className="text-xs text-muted-foreground">Mijoz</p><p className="text-sm font-medium">{selectedOrderDetails.customer_name || 'Noma\'lum'}</p></div>
                        {selectedOrderDetails.customer_phone && (<div><p className="text-xs text-muted-foreground">Telefon</p><p className="text-sm font-medium">{selectedOrderDetails.customer_phone}</p></div>)}
                        {selectedOrderDetails.customer_address && (<div><p className="text-xs text-muted-foreground">Manzil</p><p className="text-sm font-medium">{selectedOrderDetails.customer_address}</p></div>)}
                        {selectedOrderDetails.table && (<div><p className="text-xs text-muted-foreground">Stol</p><p className="text-sm font-medium">{selectedOrderDetails.table.name || 'Noma\'lum stol'}</p></div>)}
                        <div><p className="text-xs text-muted-foreground">Yaratilgan vaqt</p><p className="text-sm font-medium">{new Date(selectedOrderDetails.created_at).toLocaleString('uz-UZ', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p></div>
                        <div><p className="text-xs text-muted-foreground">Yangilangan vaqt</p><p className="text-sm font-medium">{new Date(selectedOrderDetails.updated_at).toLocaleString('uz-UZ', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p></div>
                        {selectedOrderDetails.created_by && (<div><p className="text-xs text-muted-foreground">Xodim (Yaratgan)</p><p className="text-sm font-medium">{selectedOrderDetails.created_by.first_name || ''}{' '}{selectedOrderDetails.created_by.last_name || ''}{selectedOrderDetails.created_by.username ? ` (${selectedOrderDetails.created_by.username})` : ''}{selectedOrderDetails.created_by.role?.name ? ` [${selectedOrderDetails.created_by.role.name}]` : ''}</p></div>)}
                    </div>

                     {selectedOrderDetails.payment ? (<>
                        <Separator />
                        <div>
                            <h4 className="text-sm font-semibold mb-2">To'lov tafsilotlari</h4>
                            <div className="grid gap-x-4 gap-y-2 grid-cols-1 sm:grid-cols-2">
                                <div><p className="text-xs text-muted-foreground">To'lov ID</p><p className="text-sm font-medium">{selectedOrderDetails.payment.id}</p></div>
                                <div><p className="text-xs text-muted-foreground">To'lov usuli</p><p className="text-sm font-medium">{getPaymentMethodDisplay(selectedOrderDetails.payment.method)}</p></div>
                                <div><p className="text-xs text-muted-foreground">To'langan summa</p><p className="text-sm font-medium">{(parseFloat(selectedOrderDetails.payment.amount || 0)).toLocaleString()} so'm</p></div>
                                {selectedOrderDetails.payment.paid_at && (<div><p className="text-xs text-muted-foreground">To'lov vaqti</p><p className="text-sm font-medium">{new Date(selectedOrderDetails.payment.paid_at).toLocaleString('uz-UZ', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p></div>)}
                                {selectedOrderDetails.payment.processed_by_name && (<div><p className="text-xs text-muted-foreground">Qabul qilgan xodim</p><p className="text-sm font-medium">{selectedOrderDetails.payment.processed_by_name || `(ID: ${selectedOrderDetails.payment.processed_by})`}</p></div>)}
                                {selectedOrderDetails.payment.received_amount !== null && (<div><p className="text-xs text-muted-foreground">Olingan summa (Naqd)</p><p className="text-sm font-medium">{(parseFloat(selectedOrderDetails.payment.received_amount) || 0).toLocaleString()} so'm</p></div>)}
                                {selectedOrderDetails.payment.change_amount !== null && (<div><p className="text-xs text-muted-foreground">Qaytim</p><p className="text-sm font-medium">{(parseFloat(selectedOrderDetails.payment.change_amount) || 0).toLocaleString()} so'm</p></div>)}
                                {selectedOrderDetails.payment.mobile_provider && (<div><p className="text-xs text-muted-foreground">Mobil provayder</p><p className="text-sm font-medium">{selectedOrderDetails.payment.mobile_provider}</p></div>)}
                            </div>
                        </div>
                    </>) : (<>
                        <Separator />
                        <p className="text-sm text-muted-foreground">To'lov ma'lumotlari mavjud emas.</p>
                    </>)}


                     {/* Mahsulotlar jadvali */}
                     <Separator />
                     <div>
                        <h4 className="text-sm font-semibold mb-2">Mahsulotlar</h4>
                        <Table>
                            <TableHeader><TableRow><TableHead>Mahsulot</TableHead><TableHead className="text-right w-[60px]">Miqdor</TableHead><TableHead className="text-right w-[100px]">Narx</TableHead><TableHead className="text-right w-[100px]">Jami</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {(Array.isArray(selectedOrderDetails.items) && selectedOrderDetails.items.length > 0) ? (
                                selectedOrderDetails.items.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="py-2 flex items-center gap-2">
                                            {item.product_details?.image_url && (<img src={item.product_details.image_url} alt={item.product_details.name || ''} className="w-8 h-8 rounded-sm object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}/>)}
                                            <span>{item.product_details?.name || `Mahsulot ID: ${item.product}` || 'Noma\'lum'}</span>
                                        </TableCell>
                                        <TableCell className="text-right py-2">{item.quantity || 0}</TableCell>
                                        <TableCell className="text-right py-2">{(parseFloat(item.unit_price || 0)).toLocaleString()} so'm</TableCell>
                                        <TableCell className="text-right py-2">{(parseFloat(item.total_price || 0)).toLocaleString()} so'm</TableCell>
                                    </TableRow>
                                ))
                                ) : (
                                <TableRow><TableCell colSpan={4} className="h-16 text-center text-muted-foreground py-2">Mahsulotlar topilmadi.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <Separator />
                    {/* Hisob-kitob qismi */}
                     <div className="space-y-1 text-sm">
                         <div className="flex justify-between"><span>Jami (Mahsulotlar):</span><span className="font-medium">{(selectedOrderDetails.items?.reduce((sum, item) => sum + parseFloat(item.total_price || 0), 0) || 0).toLocaleString()} so'm</span></div>
                         {parseFloat(selectedOrderDetails.service_fee_percent || 0) > 0 && (<div className="flex justify-between"><span>Xizmat haqi ({selectedOrderDetails.service_fee_percent}%):</span><span className="font-medium">+ {((selectedOrderDetails.items?.reduce((sum, item) => sum + parseFloat(item.total_price || 0), 0) || 0) * (parseFloat(selectedOrderDetails.service_fee_percent || 0) / 100)).toLocaleString()} so'm</span></div>)}
                         {parseFloat(selectedOrderDetails.tax_percent || 0) > 0 && (<div className="flex justify-between"><span>Soliq ({selectedOrderDetails.tax_percent}%):</span></div>)}
                         <div className="flex justify-between font-semibold text-base pt-1 border-t mt-2"><span>Umumiy summa:</span><span>{(parseFloat(selectedOrderDetails.final_price || 0)).toLocaleString()} so'm</span></div>
                     </div>
                </div>
            ) : (
                <div className="text-center text-muted-foreground py-10">Buyurtma ma'lumotlari topilmadi.</div>
            )}
          </ScrollArea>

          {/* Footer qismi */}
          <DialogFooter className="pt-4 border-t flex-wrap gap-2 justify-end">
              {/* Bekor qilish tugmasi (agar ma'lumot yuklangan bo'lsa va status mos kelsa) */}
              {selectedOrderDetails && (selectedOrderDetails.status === 'pending' || selectedOrderDetails.status === 'processing' || selectedOrderDetails.status === 'ready' || selectedOrderDetails.status === 'new') && (
                  <Button
                      variant="destructive"
                      onClick={() => {
                          if (confirm(`Haqiqatan ham #${selectedOrderDetails.id} raqamli buyurtmani bekor qilmoqchimisiz? Bu amalni qaytarib bo'lmaydi.`)) {
                               handleCancelOrder(selectedOrderDetails.id);
                               handleModalClose();
                          }
                      }}
                  >
                      <X className="mr-2 h-4 w-4" /> Bekor qilish
                  </Button>
              )}
              <Button variant="secondary" onClick={handleModalClose}>Yopish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Edit Dialog */}
      <Dialog open={showEditRoleDialog} onOpenChange={setShowEditRoleDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={(e) => { e.preventDefault(); handleUpdateRole(); }}>
            <DialogHeader>
              <DialogTitle>Rolni tahrirlash</DialogTitle>
              <DialogDescription>Rol nomini o'zgartiring.</DialogDescription>
            </DialogHeader>
            {isLoadingRoleDetails ? ( // Bu holat endi ishlatilmaydi, lekin qoldiramiz
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
              </div>
            ) : editingRole ? (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-role-name" className="text-right">Rol nomi*</Label>
                  <Input
                    id="edit-role-name"
                    value={editingRole.name || ''}
                    onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                    className="col-span-3"
                    placeholder="Rol nomi"
                    required
                    minLength={1}
                    maxLength={100}
                  />
                </div>
              </div>
            ) : (
               <div className="text-center py-10 text-muted-foreground">Rol ma'lumotlari topilmadi.</div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditRoleDialog(false)}>Bekor qilish</Button>
              <Button type="submit" disabled={isLoadingRoleDetails || !editingRole || !editingRole.name?.trim()}>
                 Saqlash
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- YANGI: Add Category Dialog --- */}
      <Dialog open={showAddCategoryDialog} onOpenChange={setShowAddCategoryDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={(e) => { e.preventDefault(); handleAddCategory(); }}>
              <DialogHeader>
                <DialogTitle>Yangi kategoriya qo'shish</DialogTitle>
                <DialogDescription>Yangi mahsulot kategoriyasi nomini kiriting.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="category_name" className="text-right">Nomi*</Label>
                  <Input
                    id="category_name"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ name: e.target.value })}
                    className="col-span-3"
                    placeholder="Masalan: Ichimliklar"
                    required
                    maxLength={100}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowAddCategoryDialog(false)}>Bekor qilish</Button>
                <Button type="submit">Qo'shish</Button>
              </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- YANGI: Edit Category Dialog --- */}
       <Dialog open={showEditCategoryDialog} onOpenChange={setShowEditCategoryDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={(e) => { e.preventDefault(); handleUpdateCategory(); }}>
            <DialogHeader>
              <DialogTitle>Kategoriyani tahrirlash</DialogTitle>
              <DialogDescription>Kategoriya nomini o'zgartiring.</DialogDescription>
            </DialogHeader>
            {editingCategory ? (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-category-name" className="text-right">Nomi*</Label>
                  <Input
                    id="edit-category-name"
                    value={editingCategory.name || ''}
                    onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                    className="col-span-3"
                    placeholder="Kategoriya nomi"
                    required
                    maxLength={100}
                  />
                </div>
              </div>
            ) : (
               <div className="text-center py-10 text-muted-foreground">Kategoriya ma'lumotlari topilmadi.</div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditCategoryDialog(false)}>Bekor qilish</Button>
              <Button type="submit" disabled={isUpdatingCategory || !editingCategory || !editingCategory.name?.trim()}>
                 {isUpdatingCategory && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                 Saqlash
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- YANGI: Delete Category Confirmation Dialog --- */}
      <Dialog open={showDeleteCategoryConfirmDialog} onOpenChange={setShowDeleteCategoryConfirmDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Kategoriyani o'chirishni tasdiqlang</DialogTitle>
            <DialogDescription>
              Haqiqatan ham <strong>"{categoryToDelete?.name || 'Noma\'lum'}"</strong> kategoriyasini o'chirishni xohlaysizmi? Bu amalni qaytarib bo'lmaydi.
              <span className="block mt-2 text-orange-600 dark:text-orange-400 font-medium">
                 Bu kategoriyaga tegishli mahsulotlar bo'lsa, o'chirishda xatolik yuz berishi mumkin.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDeleteCategoryConfirmDialog(false); setCategoryToDelete(null); }}>
              Bekor qilish
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteCategory}
              disabled={isDeletingCategory}
            >
              {isDeletingCategory && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              O'chirish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div> // Asosiy div yopilishi
  ); // Asosiy return yopilishi
}