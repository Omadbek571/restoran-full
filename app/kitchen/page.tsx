"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Clock, LogOut, ChevronDown, ChevronUp, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import axios from "axios"
import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

// localStorage uchun kalit so'z (key)
const LOCAL_STORAGE_VISIBLE_CATEGORIES_KEY = "kitchenVisibleCategories"

// Boshlang'ich visibleCategories holatini localStorage'dan olish yoki default qiymatni qaytarish
const getInitialVisibleCategories = () => {
  // Server-side rendering (SSR) da localStorage mavjud emasligini tekshirish
  if (typeof window === "undefined") {
    return { new: true, preparing: true, ready: true, completed: true }
  }
  try {
    const storedValue = localStorage.getItem(LOCAL_STORAGE_VISIBLE_CATEGORIES_KEY)
    if (storedValue) {
      const parsedValue = JSON.parse(storedValue)
      // Saqlangan qiymat to'g'ri formatda ekanligini tekshirish
      if (
        typeof parsedValue === "object" &&
        parsedValue !== null &&
        "new" in parsedValue &&
        "preparing" in parsedValue &&
        "ready" in parsedValue &&
        "completed" in parsedValue
      ) {
        return parsedValue
      } else {
        console.warn("localStorage'dagi visibleCategories formati noto'g'ri. Standart qiymat ishlatilmoqda.")
        // Agar format noto'g'ri bo'lsa, localStorage'ni tozalab, standart qiymatni qaytaramiz
        localStorage.removeItem(LOCAL_STORAGE_VISIBLE_CATEGORIES_KEY);
        return { new: true, preparing: true, ready: true, completed: true }
      }
    }
  } catch (error) {
    console.error("localStorage'dan visibleCategories o'qishda xatolik:", error)
    // Xatolik yuz berganda standart qiymatni qaytaramiz
  }
  // Agar localStorage'da qiymat bo'lmasa yoki xatolik bo'lsa, standart qiymat
  return { new: true, preparing: true, ready: true, completed: true }
}

export default function KitchenPage() {
  const router = useRouter()
  const [orders, setOrders] = useState([])
  const [isLoadingOrders, setIsLoadingOrders] = useState(true)
  const [error, setError] = useState("")
  const [servedOrders, setServedOrders] = useState([])
  const [isLogoutOpen, setIsLogoutOpen] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState("")
  const [openCollapsibles, setOpenCollapsibles] = useState({
    new: true,
    preparing: true,
    ready: true,
    completed: true,
  })
  // visibleCategories uchun boshlang'ich holatni localStorage'dan olamiz
  const [visibleCategories, setVisibleCategories] = useState(getInitialVisibleCategories)
  // Bildirishnomalar uchun holatlar
  const [notifications, setNotifications] = useState([]) // Bildirishnomalar ro'yxati
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false) // Modal holati
  const [notificationsLoading, setNotificationsLoading] = useState(false) // Yuklanish holati
  const [notificationsError, setNotificationsError] = useState("") // Xato holati

  // Buyurtmalarni yuklash
  useEffect(() => {
    setIsLoadingOrders(true)
    axios
      .get("https://oshxonacopy.pythonanywhere.com/api/orders/", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      .then((res) => {
        setOrders(res.data)
        setServedOrders(res.data.filter((order) => order.status === "completed"))
        setIsLoadingOrders(false)
        if (res.data.length === 0) {
          // toast.warn("Hozirda buyurtmalar mavjud emas") // Bu toastni olib tashladim, chunki yuklanishda chiqishi g'alati
        }
      })
      .catch((err) => {
        console.error("Buyurtmalarni yuklashda xato:", err)
        setError("Buyurtmalarni yuklashda xato yuz berdi")
        toast.error("Buyurtmalarni yuklashda xato yuz berdi")
        setIsLoadingOrders(false)
      })
  }, [])

  // Token tekshiruvi
  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/auth")
      toast.info("Tizimga kirish uchun autentifikatsiya talab qilinadi")
    }
  }, [router])

  // Bildirishnomalarni yuklash (GET /kitchen/unacknowledged-changes/)
  useEffect(() => {
    const fetchNotifications = async () => {
      setNotificationsLoading(true)
      setNotificationsError("")
      try {
        const response = await axios.get("https://oshxonacopy.pythonanywhere.com/api/kitchen/unacknowledged-changes/", {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        })
        setNotifications(response.data || [])
        setNotificationsLoading(false)
      } catch (err) {
        console.error("Bildirishnomalarni yuklashda xato:", err)
        setNotificationsError("Bildirishnomalarni yuklashda xato yuz berdi")
        toast.error("Bildirishnomalarni yuklashda xato yuz berdi")
        setNotificationsLoading(false)
      }
    }

    fetchNotifications()
    // Qayta yuklash intervalini qo'shishingiz mumkin (agar kerak bo'lsa)
    // const intervalId = setInterval(fetchNotifications, 30000); // Masalan, har 30 sekundda
    // return () => clearInterval(intervalId); // Komponent unmount bo'lganda intervalni tozalash
  }, [])

  // Buyurtmalarni holat bo'yicha filtrlash
  const filteredOrders = (status) => {
    switch (status) {
      case "new":
        return orders.filter((order) => order.status === "pending" || order.status === "new")
      case "preparing":
        return orders.filter((order) => order.status === "preparing")
      case "ready":
        return orders.filter((order) => order.status === "ready")
      case "completed":
        return servedOrders // Bajarilganlar alohida state'da
      default:
        return []
    }
  }

  // Buyurtma holatini "Tayyorlash"ga o'zgartirish
  const handleStartPreparing = async (orderId) => {
    try {
      await axios.post(
        `https://oshxonacopy.pythonanywhere.com/api/orders/${orderId}/start_preparation/`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      )

      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === orderId ? { ...order, status: "preparing" } : order
        )
      )
      toast.success(`Buyurtma #${orderId} tayyorlash boshlandi!`)
    } catch (err) {
      console.error("Xatolik:", err)
      toast.error("Buyurtma holatini o'zgartirishda xatolik yuz berdi")
    }
  }

  // Buyurtma holatini "Tayyor"ga o'zgartirish
  const handleOrderReady = async (orderId) => {
    try {
      await axios.post(
        `https://oshxonacopy.pythonanywhere.com/api/orders/${orderId}/mark_ready/`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      )

      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === orderId ? { ...order, status: "ready", ready_at: new Date().toISOString() } : order
        )
      )
      toast.success(`Buyurtma #${orderId} tayyor!`)
    } catch (err) {
      console.error("Xatolik:", err)
      toast.error("Buyurtma holatini o'zgartirishda xatolik yuz berdi")
    }
  }

  // Buyurtma holatini "Bajarilgan"ga o'zgartirish
  const handleCompleteOrder = async (orderId) => {
    try {
      await axios.post(
        `https://oshxonacopy.pythonanywhere.com/api/orders/${orderId}/mark-completed-chef/`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      )

      const updatedOrder = orders.find((order) => order.id === orderId) || servedOrders.find(o => o.id === orderId); // Tayyorlar ro'yxatidan yoki Bajarilganlar ro'yxatidan topish
      if (updatedOrder) {
        // Agar buyurtma 'orders' ro'yxatida bo'lsa, uni olib tashlaymiz
        setOrders((prevOrders) => prevOrders.filter((order) => order.id !== orderId));
        // Agar 'servedOrders'da bo'lmasa, unga qo'shamiz
        if (!servedOrders.some(o => o.id === orderId)) {
            setServedOrders((prevServed) => [
            ...prevServed,
            { ...updatedOrder, status: "completed", completed_at: new Date().toISOString() },
            ]);
        } else {
            // Agar allaqachon 'servedOrders'da bo'lsa (ehtimol qayta bosilgan), yangilaymiz
            setServedOrders((prevServed) => prevServed.map(o => o.id === orderId ? {...o, status: "completed", completed_at: new Date().toISOString()} : o));
        }
        toast.success(`Buyurtma #${orderId} bajarildi!`)
      } else {
          toast.warn(`Buyurtma #${orderId} topilmadi.`)
      }
    } catch (err) {
      console.error("Xatolik:", err)
      toast.error("Buyurtma holatini o'zgartirishda xatolik yuz berdi")
    }
  }

  // Buyurtmani bekor qilish funksiyasi
  const handleCancelOrder = async (orderId) => {
    // Bekor qilish uchun tasdiqlash dialogini qo'shish mumkin
    const confirmCancel = window.confirm(`Haqiqatan ham #${orderId} buyurtmani bekor qilmoqchimisiz?`);
    if (!confirmCancel) return;

    try {
      await axios.post(
        `https://oshxonacopy.pythonanywhere.com/api/orders/${orderId}/cancel_order/`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      )

      // Buyurtmani 'orders' va 'servedOrders' dan olib tashlash
      setOrders((prevOrders) => prevOrders.filter((order) => order.id !== orderId))
      setServedOrders((prevServed) => prevServed.filter((order) => order.id !== orderId))
      toast.success(`Buyurtma #${orderId} bekor qilindi!`)
    } catch (err) {
      console.error("Buyurtma bekor qilishda xato:", err)
      // Serverdan kelgan xato xabarini ko'rsatishga harakat qilish
      const errorMessage = err.response?.data?.detail || "Buyurtma bekor qilishda xato yuz berdi";
      toast.error(errorMessage)
    }
  }


  // Bildirishnomalarni tasdiqlash (POST /kitchen/acknowledge-changes/)
  const handleAcknowledgeNotification = async (logId) => {
    try {
      await axios.post(
        `https://oshxonacopy.pythonanywhere.com/api/kitchen/acknowledge-changes/`,
        {
          log_ids: [logId], // Faqat log_ids massivini yuborish
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      )

      // Bildirishnomani UI'dan olib tashlash
      setNotifications((prev) =>
        prev.filter((notification) => notification.id !== logId)
      )
      toast.success(`Bildirishnoma #${logId} tasdiqlandi!`)
    } catch (err) {
      console.error("Bildirishnomani tasdiqlashda xato:", err)
      toast.error("Bildirishnomani tasdiqlashda xato yuz berdi")
    }
  }

  // Vaqtni formatlash funksiyasi
  const formatTime = (dateString) => {
    try {
      if (!dateString) return "Vaqt ko'rsatilmagan"
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return "Noto'g'ri vaqt formati"
      return date.toLocaleTimeString("uz-UZ", {
        hour: "2-digit",
        minute: "2-digit",
        // day: "2-digit",  // Kun, oy, yilni ko'rsatish shart emas, agar kerak bo'lsa, oching
        // month: "2-digit",
        // year: "numeric",
      })
    } catch (error) {
      console.error("Vaqtni formatlashda xatolik:", error)
      return "Vaqtni formatlashda xatolik"
    }
  }

    // Vaqt farqini hisoblash funksiyasi
    const getTimeDifference = (dateString) => {
      try {
        if (!dateString) return "Noma'lum";
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return "Noto'g'ri format";

        const now = new Date();
        const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffSeconds < 60) return `hozir`;
        const diffMinutes = Math.floor(diffSeconds / 60);
        if (diffMinutes < 60) return `${diffMinutes} daq oldin`;
        const diffHours = Math.floor(diffMinutes / 60);
        if (diffHours < 24) return `${diffHours} soat oldin`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays} kun oldin`;
      } catch (error) {
        console.error("Vaqt farqini hisoblashda xatolik:", error);
        return "Xatolik";
      }
    };


  // Batafsil ko'rish funksiyasi
  const handleViewDetails = async (orderId) => {
    setDetailsLoading(true)
    setDetailsError("")
    setSelectedOrderDetails(null) // Eski ma'lumotni tozalash

    try {
      const response = await axios.get(`https://oshxonacopy.pythonanywhere.com/api/orders/${orderId}/`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      setSelectedOrderDetails(response.data)
      setIsDetailsOpen(true)
      // toast.info(`Buyurtma #${orderId} tafsilotlari yuklandi`) // Bu toast keraksiz bo'lishi mumkin
    } catch (err) {
      console.error("Buyurtma tafsilotlarini yuklashda xato:", err)
      setDetailsError("Buyurtma tafsilotlarini yuklashda xato yuz berdi")
      toast.error("Buyurtma tafsilotlarini yuklashda xato yuz berdi")
      setIsDetailsOpen(false) // Xatolik bo'lsa oynani yopish
    } finally {
      setDetailsLoading(false)
    }
  }

  // Chiqish funksiyasi
  const handleLogout = () => {
    setIsLogoutOpen(true)
  }

  // Modal tasdiqlanganda chiqish
  const confirmLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("refresh")
    localStorage.removeItem("user")
    // localStorage'dagi filtr sozlamalarini ham tozalash (ixtiyoriy)
    // localStorage.removeItem(LOCAL_STORAGE_VISIBLE_CATEGORIES_KEY);
    router.push("/auth")
    setIsLogoutOpen(false)
    toast.info("Tizimdan chiqildi")
  }

  // Collapsible holatini boshqarish
  const toggleCollapsible = (category) => {
    setOpenCollapsibles((prev) => ({
      ...prev,
      [category]: !prev[category],
    }))
    // Collapsible holatini localStorage'ga saqlash shart emas,
    // chunki bu faqat joriy sessiyadagi UI holati
  }

  // Checkbox holatini boshqarish va localStorage ga saqlash
  const handleCategoryToggle = (category) => {
    // 1. Yangi holatni hisoblash
    const newState = {
      ...visibleCategories,
      [category]: !visibleCategories[category],
    };

    // 2. State'ni yangilash
    setVisibleCategories(newState);

    // 3. Yangi holatni localStorage'ga saqlash
    try {
      localStorage.setItem(LOCAL_STORAGE_VISIBLE_CATEGORIES_KEY, JSON.stringify(newState));
    } catch (error) {
      console.error("visibleCategories holatini localStorage'ga saqlashda xatolik:", error);
      toast.error("Filtr sozlamalarini saqlashda xatolik yuz berdi");
    }
  };


  // Buyurtma kartasi komponenti
  const OrderCard = ({ order, actionButton, isReadySection = false }) => {
    // Bekor qilish mumkin bo'lgan holatlar: 'pending' yoki 'new'
    const canCancel = order.status === "pending" || order.status === "new";

    return (
      <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="bg-muted/50 p-3"> {/* Paddingni kamaytirdim */}
          <div className="flex justify-between items-start gap-2"> {/* Gap qo'shdim */}
            <div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2 mb-1"> {/* Margin bottom qo'shdim */}
                <span>#{order.id}</span>
                <Badge variant={order.order_type === "delivery" ? "destructive" : "outline"} className="text-xs px-1.5 py-0.5"> {/* Kichikroq badge */}
                  {order.order_type_display}
                </Badge>
              </CardTitle>

              {(order.order_type === "delivery" || order.order_type === "takeaway") && (
                <div className="mt-1 space-y-0.5 text-xs"> {/* O'lchamlarni kichiklashtirdim */}
                  {order.customer_name && <div className="font-medium">{order.customer_name}</div>}
                  {order.customer_phone && (
                    <div className="text-muted-foreground">Tel: {order.customer_phone}</div>
                  )}
                  {order.order_type === "delivery" && order.customer_address && (
                    <div className="text-muted-foreground">Manzil: {order.customer_address}</div>
                  )}
                </div>
              )}

              <div className="text-xs text-muted-foreground mt-1"> {/* O'lchamlarni kichiklashtirdim */}
                <Clock className="h-3 w-3 inline mr-1" /> {/* Ikonkani kichiklashtirdim */}
                {formatTime(order.created_at || order.completed_at)}
                {/* Vaqt farqi uchun alohida qator */}
                <span className="ml-2">({getTimeDifference(order.created_at || order.ready_at || order.completed_at)})</span>
              </div>
              {order.table_name && ( // Faqat stol mavjud bo'lsa ko'rsatish
                <div className="text-xs text-muted-foreground mt-1">
                  Stol: {order.table_name}
                </div>
              )}
              <div className="text-xs text-muted-foreground mt-1">
                {order.item_count} ta mahsulot
              </div>
               {/* Narxni ko'rsatish shart bo'lmasligi mumkin */}
              {/* <div className="text-xs text-muted-foreground mt-1">
                 {order.final_price} so'm
              </div> */}
            </div>
             {/* Bu Badge vaqt farqini ko'rsatish uchun ishlatilmayapti, olib tashladim */}
            {/* <Badge variant="secondary">{getTimeDifference(order.created_at || order.completed_at)}</Badge> */}
          </div>
        </CardHeader>

        <CardFooter className="border-t p-2">
          <div className="flex flex-col space-y-2 w-full">
            {actionButton && <div className="w-full">{actionButton}</div>}
            <Button
              variant="outline"
              size="sm" // Hajmini kichiklashtirish
              className="w-full" // Batafsil tugmasini to'liq kenglikda
              onClick={() => handleViewDetails(order.id)}
              disabled={detailsLoading && selectedOrderDetails?.id === order.id} // Yuklanayotganda bloklash
            >
              {detailsLoading && selectedOrderDetails?.id === order.id ? "Yuklanmoqda..." : "Batafsil"}
            </Button>
            {canCancel && (
              <Button
                variant="destructive"
                size="sm" // Hajmini kichiklashtirish
                className="w-full"
                onClick={() => handleCancelOrder(order.id)}
              >
                Bekor qilish
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    )
  }


  // --- UI QISMI BOSHLANISHI ---

  if (isLoadingOrders) {
    return <div className="flex h-screen items-center justify-center text-lg font-medium">Yuklanmoqda...</div>
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center text-center px-4">
        <p className="text-destructive text-lg mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Qayta yuklash</Button>
      </div>
    )
  }

  // Ko'rsatiladigan kategoriyalar sonini hisoblash
  const visibleCategoryCount = Object.values(visibleCategories).filter(Boolean).length;
  // Grid uchun class nomini dinamik generatsiya qilish
  const gridColsClass =
    visibleCategoryCount === 4
      ? "grid-cols-1 lg:grid-cols-4"
      : visibleCategoryCount === 3
      ? "grid-cols-1 md:grid-cols-3"
      : visibleCategoryCount === 2
      ? "grid-cols-1 sm:grid-cols-2"
      : "grid-cols-1";


  return (
    <div className="flex h-screen flex-col bg-gray-50"> {/* Orqa fon rangi */}
      {/* Toast Container */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored" // Rangli toastlar
      />

      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b bg-white px-4 sticky top-0 z-10 shadow-sm"> {/* Header sticki va soya */}
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-gray-800">Oshxona Boshqaruvi</h1>
        </div>
        <div className="flex items-center space-x-3"> {/* Oraliq masofa kamaytirildi */}
          {/* Kategoriya filteri */}
          <Select>
            <SelectTrigger className="w-auto sm:w-[180px] h-9"> {/* Adaptiv kenglik va balandlik */}
              <SelectValue placeholder="Kategoriyalar" />
            </SelectTrigger>
            <SelectContent>
              <div className="p-2 space-y-2">
                <div className="flex items-center space-x-2 cursor-pointer" onClick={() => handleCategoryToggle("new")}>
                  <Checkbox
                    id="new"
                    checked={visibleCategories.new}
                    readOnly // onClick SelectItem'da ishlashi uchun
                  />
                  <label htmlFor="new" className="text-sm font-medium cursor-pointer">
                    Yangi ({filteredOrders("new").length}) {/* Buyurtmalar soni */}
                  </label>
                </div>
                <div className="flex items-center space-x-2 cursor-pointer" onClick={() => handleCategoryToggle("preparing")}>
                  <Checkbox
                    id="preparing"
                    checked={visibleCategories.preparing}
                    readOnly
                  />
                  <label htmlFor="preparing" className="text-sm font-medium cursor-pointer">
                    Tayyorlanmoqda ({filteredOrders("preparing").length})
                  </label>
                </div>
                <div className="flex items-center space-x-2 cursor-pointer" onClick={() => handleCategoryToggle("ready")}>
                  <Checkbox
                    id="ready"
                    checked={visibleCategories.ready}
                    readOnly
                  />
                  <label htmlFor="ready" className="text-sm font-medium cursor-pointer">
                    Tayyor ({filteredOrders("ready").length})
                  </label>
                </div>
                <div className="flex items-center space-x-2 cursor-pointer" onClick={() => handleCategoryToggle("completed")}>
                  <Checkbox
                    id="completed"
                    checked={visibleCategories.completed}
                    readOnly
                  />
                  <label htmlFor="completed" className="text-sm font-medium cursor-pointer">
                    Bajarilgan ({filteredOrders("completed").length})
                  </label>
                </div>
              </div>
            </SelectContent>
          </Select>

          {/* Bildirishnoma ikonkasi */}
          <div className="relative">
            <Button
              variant="ghost" // Orqa fonsiz tugma
              size="icon"
              className="h-9 w-9 rounded-full hover:bg-gray-100" // Hover effekti
              onClick={() => setIsNotificationsOpen(true)}
            >
              <Bell className="h-5 w-5 text-gray-600" /> {/* Ikona rangi */}
              {notifications.length > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center rounded-full text-xs p-0" // Kichikroq badge
                >
                  {notifications.length}
                </Badge>
              )}
            </Button>
          </div>

          {/* Chiqish tugmasi */}
          <AlertDialog open={isLogoutOpen} onOpenChange={setIsLogoutOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost" // Orqa fonsiz tugma
                size="icon"
                className="h-9 w-9 rounded-full hover:bg-gray-100" // Hover effekti
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5 text-gray-600" /> {/* Ikona rangi */}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Chiqishni tasdiqlaysizmi?</AlertDialogTitle>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Yo'q</AlertDialogCancel>
                <AlertDialogAction onClick={confirmLogout}>Ha</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </header>

      {/* Bildirishnomalar modali */}
      <AlertDialog open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
        <AlertDialogContent className="max-w-lg"> {/* Kengroq modal */}
          <AlertDialogHeader>
            <AlertDialogTitle>Oxirgi O'zgarishlar (Bildirishnomalar)</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="max-h-[70vh] overflow-y-auto p-1 pr-3"> {/* Scroll uchun padding */}
            {notificationsLoading ? (
              <div className="flex items-center justify-center h-32 text-gray-500">
                Yuklanmoqda...
              </div>
            ) : notificationsError ? (
              <div className="text-destructive text-center p-4">{notificationsError}</div>
            ) : notifications.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                Yangi bildirishnomalar yo'q
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <Card
                    key={notification.id}
                    className={`p-3 text-sm border ${ // Padding va o'lcham
                      notification.quantity_change < 0 ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-200" // Ranglar
                    }`}
                  >
                    <div className="flex justify-between items-start gap-3"> {/* Oraliq masofa */}
                      <div className="flex-1"> {/* Matn sig'ishi uchun */}
                        <p className="font-medium text-gray-800">
                          Buyurtma #{notification.order_id} - {notification.product_name}
                        </p>
                        <p className={`font-semibold ${notification.quantity_change < 0 ? "text-red-600" : "text-green-600"}`}>
                          {notification.change_type_display}
                          {notification.quantity_change !== null
                            ? ` (Miqdor: ${notification.quantity_change > 0 ? "+" : ""}${notification.quantity_change})`
                            : ""}
                        </p>
                         <p className="text-xs text-gray-500 mt-1">
                          {formatTime(notification.timestamp)} ({getTimeDifference(notification.timestamp)})
                        </p>
                        <p className="text-xs text-gray-500">
                          Kim tomonidan: {notification.user_name || "Noma'lum"}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm" // Kichikroq tugma
                        className="h-8 px-2" // Tugma o'lchami
                        onClick={() => handleAcknowledgeNotification(notification.id)}
                      >
                        Ok
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel>Yopish</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batafsil ko'rish modali */}
      <AlertDialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <AlertDialogContent className="max-w-2xl"> {/* Kengroq modal */}
          <AlertDialogHeader>
            <AlertDialogTitle>Buyurtma #{selectedOrderDetails?.id} Tafsilotlari</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="max-h-[75vh] overflow-y-auto p-1 pr-4 space-y-4"> {/* Scroll va oraliq */}
            {detailsLoading ? (
              <div className="text-center p-10 text-gray-500">Yuklanmoqda...</div>
            ) : detailsError ? (
              <div className="text-destructive text-center p-10">{detailsError}</div>
            ) : selectedOrderDetails ? (
              <>
                {/* Buyurtma Asosiy Ma'lumotlari */}
                <Card>
                  <CardHeader className="p-3 bg-gray-50">
                    <CardTitle className="text-base font-semibold">Asosiy ma'lumotlar</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                     <p><strong>ID:</strong> {selectedOrderDetails.id}</p>
                    <p><strong>Turi:</strong> <Badge variant={selectedOrderDetails.order_type === "delivery" ? "destructive" : "outline"}>{selectedOrderDetails.order_type_display}</Badge></p>
                    <p><strong>Holati:</strong> <Badge variant="secondary">{selectedOrderDetails.status_display}</Badge></p>
                    <p><strong>Stol:</strong> {selectedOrderDetails.table?.name || "Ko'rsatilmagan"}</p>
                     {selectedOrderDetails.table?.zone && <p><strong>Zona:</strong> {selectedOrderDetails.table.zone}</p>}
                    <p><strong>Yaratildi:</strong> {formatTime(selectedOrderDetails.created_at)} ({getTimeDifference(selectedOrderDetails.created_at)})</p>
                     {selectedOrderDetails.updated_at && <p><strong>Yangilandi:</strong> {formatTime(selectedOrderDetails.updated_at)} ({getTimeDifference(selectedOrderDetails.updated_at)})</p>}
                    <p><strong>Xizmat haqi:</strong> {selectedOrderDetails.service_fee_percent}%</p>
                    <p><strong>Soliq:</strong> {selectedOrderDetails.tax_percent}%</p>
                     <p className="col-span-2 pt-2 border-t mt-1"><strong>Umumiy narx:</strong> <span className="font-bold text-base">{selectedOrderDetails.final_price} so'm</span></p>
                  </CardContent>
                </Card>

                 {/* Mijoz ma'lumotlari (agar mavjud bo'lsa) */}
                {(selectedOrderDetails.customer_name || selectedOrderDetails.customer_phone || selectedOrderDetails.customer_address) && (
                  <Card>
                    <CardHeader className="p-3 bg-gray-50">
                      <CardTitle className="text-base font-semibold">Mijoz ma'lumotlari</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 text-sm space-y-1">
                      {selectedOrderDetails.customer_name && <p><strong>Ism:</strong> {selectedOrderDetails.customer_name}</p>}
                      {selectedOrderDetails.customer_phone && <p><strong>Telefon:</strong> {selectedOrderDetails.customer_phone}</p>}
                      {selectedOrderDetails.customer_address && <p><strong>Manzil:</strong> {selectedOrderDetails.customer_address}</p>}
                    </CardContent>
                  </Card>
                )}

                {/* Buyurtma elementlari */}
                <Card>
                  <CardHeader className="p-3 bg-gray-50">
                    <CardTitle className="text-base font-semibold">Buyurtma tarkibi</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0"> {/* Paddingni olib tashladim, list o'zi boshqaradi */}
                    {selectedOrderDetails.items && selectedOrderDetails.items.length > 0 ? (
                      <ul className="divide-y divide-gray-200">
                        {selectedOrderDetails.items.map((item) => (
                          <li key={item.id} className="p-3 flex items-center space-x-3">
                            {item.product_details.image_url ? (
                              <img
                                src={item.product_details.image_url}
                                alt={item.product_details.name}
                                className="w-12 h-12 object-cover rounded border" // Rasm o'lchami va chegarasi
                                onError={(e) => { e.target.style.display = 'none'; }} // Rasm yuklanmasa yashirish
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gray-200 rounded border flex items-center justify-center text-gray-400 text-xl">?</div> // Placeholder
                            )}
                            <div className="flex-1 text-sm">
                              <p className="font-medium">{item.product_details.name}</p>
                              <p className="text-gray-600">{item.quantity} x {item.unit_price} so'm</p>
                            </div>
                            <p className="font-semibold text-sm">{item.total_price} so'm</p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="p-4 text-center text-gray-500">Buyurtma tarkibi bo'sh</p>
                    )}
                  </CardContent>
                </Card>


              </>
            ) : (
              <div className="text-center p-10 text-gray-500">Ma'lumotlar topilmadi</div>
            )}
          </div>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel>Yopish</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Main content */}
      <main className="flex-1 p-4 overflow-auto">
        {visibleCategoryCount === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-lg">
            Iltimos, ko'rsatish uchun kamida bitta kategoriya tanlang.
          </div>
        ) : (
          <div className={`grid gap-4 ${gridColsClass}`}>
            {/* Yangi buyurtmalar */}
            {visibleCategories.new && (
              <div className="flex flex-col rounded-lg overflow-hidden bg-white shadow-sm border border-gray-200"> {/* Stil qo'shildi */}
                <Collapsible
                  open={openCollapsibles.new}
                  onOpenChange={() => toggleCollapsible("new")}
                   className="flex-1 flex flex-col" // To'liq egallash uchun
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-gray-100 border-b"> {/* Styling */}
                    <h2 className="text-lg font-semibold text-gray-700">Yangi ({filteredOrders("new").length})</h2>
                    {openCollapsibles.new ? (
                      <ChevronUp className="h-5 w-5 text-gray-600" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-600" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="flex-1 overflow-y-auto p-3"> {/* Padding */}
                     {filteredOrders("new").length === 0 ? (
                        <div className="flex items-center justify-center h-32 text-muted-foreground">
                          Yangi buyurtmalar yo'q
                        </div>
                      ) : (
                         <div className="space-y-3"> {/* Oraliq masofa */}
                           {filteredOrders("new").map((order) => (
                            <OrderCard
                              key={order.id}
                              order={order}
                              actionButton={
                                <Button
                                  size="sm" // Kichikroq tugma
                                  className="w-full bg-blue-500 hover:bg-blue-600 text-white" // Ranglar
                                  onClick={() => handleStartPreparing(order.id)}
                                >
                                  Tayyorlashni boshlash
                                </Button>
                              }
                            />
                          ))}
                        </div>
                      )}
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {/* Tayyorlanmoqda buyurtmalar */}
            {visibleCategories.preparing && (
               <div className="flex flex-col rounded-lg overflow-hidden bg-white shadow-sm border border-gray-200">
                <Collapsible
                  open={openCollapsibles.preparing}
                  onOpenChange={() => toggleCollapsible("preparing")}
                   className="flex-1 flex flex-col"
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-gray-100 border-b">
                     <h2 className="text-lg font-semibold text-gray-700">Tayyorlanmoqda ({filteredOrders("preparing").length})</h2>
                    {openCollapsibles.preparing ? (
                      <ChevronUp className="h-5 w-5 text-gray-600" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-600" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="flex-1 overflow-y-auto p-3">
                    {filteredOrders("preparing").length === 0 ? (
                       <div className="flex items-center justify-center h-32 text-muted-foreground">
                         Tayyorlanayotgan buyurtmalar yo'q
                       </div>
                     ) : (
                       <div className="space-y-3">
                         {filteredOrders("preparing").map((order) => (
                           <OrderCard
                             key={order.id}
                             order={order}
                             actionButton={
                               <Button
                                 size="sm"
                                 className="w-full bg-yellow-500 hover:bg-yellow-600 text-white" // Ranglar
                                 onClick={() => handleOrderReady(order.id)}
                               >
                                 Tayyor bo'ldi
                               </Button>
                             }
                           />
                         ))}
                       </div>
                     )}
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {/* Tayyor buyurtmalar */}
            {visibleCategories.ready && (
              <div className="flex flex-col rounded-lg overflow-hidden bg-white shadow-sm border border-gray-200">
                <Collapsible
                  open={openCollapsibles.ready}
                  onOpenChange={() => toggleCollapsible("ready")}
                  className="flex-1 flex flex-col"
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-gray-100 border-b">
                    <h2 className="text-lg font-semibold text-gray-700">Tayyor ({filteredOrders("ready").length})</h2>
                    {openCollapsibles.ready ? (
                      <ChevronUp className="h-5 w-5 text-gray-600" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-600" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="flex-1 overflow-y-auto p-3">
                     {filteredOrders("ready").length === 0 ? (
                        <div className="flex items-center justify-center h-32 text-muted-foreground">
                          Tayyor buyurtmalar yo'q
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {filteredOrders("ready").map((order) => (
                            <OrderCard
                              key={order.id}
                              order={order}
                              isReadySection={true}
                              actionButton={
                                <Button
                                  size="sm"
                                  className="w-full bg-green-600 hover:bg-green-700 text-white" // Ranglar
                                  onClick={() => handleCompleteOrder(order.id)}
                                >
                                  Bajarildi (Oshpaz)
                                </Button>
                              }
                            />
                          ))}
                        </div>
                      )}
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {/* Bajarilgan buyurtmalar */}
            {visibleCategories.completed && (
              <div className="flex flex-col rounded-lg overflow-hidden bg-white shadow-sm border border-gray-200">
                <Collapsible
                  open={openCollapsibles.completed}
                  onOpenChange={() => toggleCollapsible("completed")}
                  className="flex-1 flex flex-col"
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-gray-100 border-b">
                    <h2 className="text-lg font-semibold text-gray-700">Bajarilgan ({filteredOrders("completed").length})</h2>
                    {openCollapsibles.completed ? (
                      <ChevronUp className="h-5 w-5 text-gray-600" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-600" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="flex-1 overflow-y-auto p-3">
                     {filteredOrders("completed").length === 0 ? (
                       <div className="flex items-center justify-center h-32 text-muted-foreground">
                          Bajarilgan buyurtmalar yo'q
                       </div>
                     ) : (
                       <div className="space-y-3">
                         {/* Bajarilgan buyurtmalar uchun action button yo'q */}
                         {filteredOrders("completed").map((order) => (
                            <OrderCard key={order.id} order={order} />
                          ))}
                       </div>
                     )}
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}