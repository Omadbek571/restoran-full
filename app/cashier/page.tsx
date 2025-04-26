"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, CreditCard, DollarSign, LogOut, Printer, Receipt, ShoppingCart, Smartphone, X } from "lucide-react" // X ikonkasi qo'shildi
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose // DialogClose import qilindi
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import axios from "axios"
import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

export default function CashierPage() {
  const router = useRouter()
  const [orders, setOrders] = useState([])
  const [paymentHistory, setPaymentHistory] = useState([])
  const [selectedOrder, setSelectedOrder] = useState(null) // To'lov uchun tanlangan buyurtma
  const [viewingOrderDetails, setViewingOrderDetails] = useState(null) // Ko'rish uchun tanlangan buyurtma (tarix)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [cashReceived, setCashReceived] = useState("")
  const [selectedMobileProvider, setSelectedMobileProvider] = useState("")
  const [showReceiptDialog, setShowReceiptDialog] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false) // Tarix tafsilotlari dialogi uchun
  const [isLoading, setIsLoading] = useState(true)
  const [errorOrders, setErrorOrders] = useState("")
  const [errorHistory, setErrorHistory] = useState("")
  const [paymentError, setPaymentError] = useState("")
  const [isFinalizing, setIsFinalizing] = useState(false); // Yakunlash jarayoni uchun

  // Helper function to get token securely
  const getToken = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("token")
    }
    return null
  }

  useEffect(() => {
    setIsLoading(true)
    const token = getToken()
    if (!token) {
      router.replace("/auth")
      toast.error("Sessiya topilmadi. Iltimos, qayta kiring.")
      setIsLoading(false)
      return
    }

    let isMounted = true

    const fetchOrders = axios.get("https://oshxonacopy.pythonanywhere.com/api/cashier/orders-ready/", {
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
    })

    const fetchHistory = axios.get("https://oshxonacopy.pythonanywhere.com/api/cashier/payment-history/", {
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
    })

    Promise.all([fetchOrders, fetchHistory])
      .then(([ordersRes, historyRes]) => {
        if (isMounted) {
          console.log("Tayyor buyurtmalar API javobi:", ordersRes.data)
          setOrders(ordersRes.data || [])
          if (ordersRes.data?.length === 0) {
            if (!errorOrders) toast.info("Hozirda tayyor buyurtmalar mavjud emas.")
          }

          console.log("To'langan buyurtmalar tarixi API javobi:", historyRes.data)
           const sortedHistory = (historyRes.data || []).sort((a, b) =>
               new Date(b.payment?.timestamp || b.updated_at) - new Date(a.payment?.timestamp || a.updated_at)
           );
          setPaymentHistory(sortedHistory)
           if (historyRes.data?.length === 0) {
              if (!errorHistory) toast.info("To'langan buyurtmalar tarixi mavjud emas.")
          }
        }
      })
      .catch((err) => {
         if (isMounted) {
            console.error("Ma'lumotlarni yuklashda xato:", err)
            if (err.response?.status === 401) {
                toast.error("Sessiya muddati tugagan yoki yaroqsiz. Iltimos, qayta kiring.")
                localStorage.removeItem("token")
                router.replace("/auth")
            } else {
                setErrorOrders("Tayyor buyurtmalarni yuklashda xato.")
                setErrorHistory("To'lov tarixini yuklashda xato.")
                toast.error("Ma'lumotlarni yuklashda xatolik yuz berdi.")
            }
         }
      })
      .finally(() => {
         if (isMounted) {
            setIsLoading(false)
         }
      })

      return () => {
          isMounted = false
      }

  }, [router])

  const formatTime = (dateString) => {
     if (!dateString) return "N/A"
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
         return "Noto'g'ri sana"
      }
      return date.toLocaleTimeString("uz-UZ", {
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch (e) {
      console.error("Sana formatlashda xato:", e)
      return "Xatolik"
    }
  }

  // Faqat to'lov uchun buyurtma tanlash
  const handleSelectOrderForPayment = (order) => {
    if (!order) return
    setSelectedOrder(order)
    setShowPaymentDialog(false)
    setPaymentMethod("cash")
    setCashReceived("")
    setSelectedMobileProvider("")
    setPaymentError("")
    setIsFinalizing(false);
  }

  // Tarixdan buyurtmani faqat ko'rish uchun tanlash
  const handleViewHistoryDetails = (order) => {
      if (!order) return;
      setViewingOrderDetails(order);
      setShowDetailsDialog(true);
  }

  const handlePayment = () => {
    if (selectedOrder) {
        setPaymentError("")
        setPaymentMethod("cash")
        setCashReceived("")
        setSelectedMobileProvider("")
        setShowPaymentDialog(true)
    } else {
      toast.warn("Iltimos, avval to'lov uchun buyurtmani tanlang")
    }
  }

  const handleCompletePayment = async () => {
    if (!selectedOrder) {
      toast.error("Buyurtma tanlanmagan!")
      return
    }

    setPaymentError("")
    const token = getToken()
    if (!token) {
      setPaymentError("Avtorizatsiya xatosi. Iltimos, qayta kiring.")
      router.replace("/auth")
      toast.error("Avtorizatsiya tokeni topilmadi!")
      return
    }

    if (!paymentMethod || !["cash", "card", "mobile"].includes(paymentMethod)) {
      const errorMsg = "Iltimos, to'g'ri to'lov usulini tanlang."
      setPaymentError(errorMsg)
      toast.error(errorMsg)
      return
    }

    if (paymentMethod === "mobile" && !selectedMobileProvider) {
      const errorMsg = "Mobil to'lov uchun provayderni tanlang (Payme, Click, Apelsin)."
      setPaymentError(errorMsg)
      toast.error(errorMsg)
      return
    }

    const finalPrice = parseFloat(selectedOrder.final_price || 0)
    const received = parseFloat(cashReceived)
    if (paymentMethod === "cash" && (isNaN(received) || received <= 0)) {
      const errorMsg = "Iltimos, qabul qilingan naqd summani kiriting."
      setPaymentError(errorMsg)
      toast.error(errorMsg)
      return
    }
    if (paymentMethod === "cash" && received < finalPrice) {
      const errorMsg = `Qabul qilingan summa (${received.toLocaleString()} so'm) jami summadan (${finalPrice.toLocaleString()} so'm) kam bo'lishi mumkin emas.`
      setPaymentError(errorMsg)
      toast.error(errorMsg)
      return
    }

    const paymentData = {
      method: paymentMethod,
      ...(paymentMethod === "cash" && { received_amount: received }),
      ...(paymentMethod === "mobile" && { mobile_provider: selectedMobileProvider }),
    }

    toast.promise(
      axios.post(
        `https://oshxonacopy.pythonanywhere.com/api/orders/${selectedOrder.id}/process_payment/`,
        paymentData,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      ),
      {
        pending: 'To\'lov amalga oshirilmoqda...',
        success: `Buyurtma #${selectedOrder.id} to'lovi muvaffaqiyatli!`,
        error: 'To\'lovni amalga oshirishda xato yuz berdi!'
      }
    )
    .then((response) => {
      console.log("To'lov muvaffaqiyatli:", response.data)

       const paidOrder = { ...selectedOrder, payment: response.data }
       setOrders((prevOrders) => prevOrders.filter((order) => order.id !== selectedOrder.id))
        setPaymentHistory((prevHistory) =>
           [paidOrder, ...prevHistory].sort((a, b) =>
               new Date(b.payment?.timestamp || b.updated_at) - new Date(a.payment?.timestamp || a.updated_at)
           )
       );

      setShowPaymentDialog(false)
      setSelectedOrder(paidOrder) // To'langan buyurtmani hali ham selected qilib turamiz, chek uchun
      setShowReceiptDialog(true)

    })
    .catch((err) => {
      console.error("To'lov xatosi:", err)
      const errorMessage =
        err.response?.data?.detail ||
        (err.response?.data && typeof err.response.data === 'object' ? JSON.stringify(err.response.data) : null) ||
        "To'lovda noma'lum xatolik."
      setPaymentError(errorMessage)
    })
  }

   // Chekni "chop etish" va Oshpaz actionini chaqirish (OGOHLANTIRISH BILAN)
   const handlePrintReceipt = async () => {
     // selectedOrder endi faqat to'lov qilingan buyurtma uchun ishlatiladi
     if (!selectedOrder || !selectedOrder.id || !selectedOrder.payment) {
       toast.error("Yakunlash uchun to'langan buyurtma ma'lumotlari topilmadi.");
       return;
     }
     if (isFinalizing) return; // Agar jarayon ketayotgan bo'lsa, qayta bosishni oldini olish

     setIsFinalizing(true); // Yakunlash jarayoni boshlandi
     const token = getToken();
     const orderId = selectedOrder.id;

     // 1. Haqiqiy printerga yuborish logikasi (simulyatsiya)
     console.log(`Buyurtma #${orderId} uchun chek chop etish simulyatsiyasi`);
     // window.print(); // Haqiqiy chop etish uchun (kerak bo'lsa)

     // 2. Backendga buyurtmani yakunlangan deb belgilash uchun so'rov yuborish
     // OGOHLANTIRISH: Bu API endpoint odatda Oshpaz tomonidan TO'LOVDAN OLDIN ishlatiladi.
     // Kassir tomonidan TO'LOVDAN KEYIN chaqirilishi backend xatoligiga olib kelishi mumkin!
     toast.promise(
       axios.post(
         `https://oshxonacopy.pythonanywhere.com/api/orders/${orderId}/mark-completed-chef/`,
         {}, // POST so'rovi uchun bo'sh tana
         {
           headers: {
             Authorization: `Bearer ${token}`,
             "Content-Type": "application/json", // Content-Type qo'shish yaxshi amaliyot
           },
         }
       ),
       {
         pending: `Buyurtma #${orderId} yakuniy holatga o'tkazilmoqda...`,
         success: {
           render(){
             // Muvaffaqiyatli yakunlangandan keyin UI ni tozalash
             setShowReceiptDialog(false); // Dialog'ni yopish

             // Agar dine_in bo'lsa stolni bo'shatish haqida xabar (opsional)
             if (selectedOrder?.order_type === "dine_in") {
               toast.info(`Stol ${selectedOrder.table?.name || selectedOrder.table_id || ''} endi bo'sh`, { autoClose: 4000 });
             }

             // Tanlangan buyurtmani tozalash, kassir keyingi buyurtmaga o'tishi uchun
             setSelectedOrder(null); // <-- Bu endi asosiy tozalash joyi
             setCashReceived("");
             setSelectedMobileProvider("");
             setPaymentMethod("cash");

             return `Buyurtma #${orderId} yakunlandi va chek chop etildi!`;
           }
         },
         error: {
           render({data}){
             // Xatolik xabarini ko'rsatish
             console.error(`Buyurtma #${orderId} ni yakunlashda xato (/mark-completed-chef/):`, data);
             const errorDetail = data?.response?.data?.detail || "Noma'lum xatolik.";
             // Agar status xatoligi bo'lsa, tushunarliroq xabar berish
             if (errorDetail.includes("'Tayyor' statusidagi")) {
                toast.warn(`Buyurtma #${orderId} allaqachon boshqa statusda. Yakunlash shart emas.`);
                // Xatolik bo'lsa ham, UI ni tozalashga ruxsat berish mumkin (chunki to'lov o'tgan)
                setShowReceiptDialog(false);
                setSelectedOrder(null);
                setCashReceived("");
                setSelectedMobileProvider("");
                setPaymentMethod("cash");
                return `Buyurtma #${orderId} yakunlandi (holat o'zgarmadi). Chek chop etildi.`;
             }
             // Boshqa xatoliklar
             return `Xatolik: Buyurtmani yakunlab bo'lmadi (${errorDetail})`;
           }
         }
       }
     ).finally(() => {
       setIsFinalizing(false); // Yakunlash jarayoni tugadi (xato bo'lsa ham)
     });
   };


  const calculateChange = () => {
    if (paymentMethod !== 'cash' || !cashReceived || !selectedOrder?.final_price) return 0
    const received = parseFloat(cashReceived)
    const price = parseFloat(selectedOrder.final_price)
    if (isNaN(received) || isNaN(price) || received < price) return 0
    return received - price
  }

  if (isLoading) {
    return (
       <div className="flex h-screen items-center justify-center bg-muted/40">
         <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
             <span>Ma'lumotlar yuklanmoqda...</span>
          </div>
      </div>
     )
  }

  return (
    <div className="flex h-screen flex-col bg-muted/40">
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
        theme="colored"
      />

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-4 sm:px-6 shrink-0">
         <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="outline" size="icon" className="shrink-0" onClick={() => router.push("/pos")}>
            <ArrowLeft className="h-5 w-5" />
             <span className="sr-only">Ortga (POS)</span>
          </Button>
          <h1 className="text-lg sm:text-xl font-bold">Kassa</h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <Button
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={() => {
              localStorage.removeItem("token")
              router.replace("/auth")
              toast.info("Tizimdan muvaffaqiyatli chiqildi")
            }}
            title="Chiqish"
          >
            <LogOut className="h-5 w-5" />
            <span className="sr-only">Chiqish</span>
          </Button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-0 overflow-hidden">
         {/* Chap ustun: Buyurtmalar ro'yxati */}
         <div className="md:col-span-1 border-r border-border flex flex-col overflow-hidden bg-background">
           <Tabs defaultValue="ready-orders" className="flex-1 flex flex-col overflow-hidden">
             <TabsList className="grid w-full grid-cols-2 shrink-0 h-11 border-b bg-background z-10">
               <TabsTrigger value="ready-orders" className="text-xs sm:text-sm">Tayyor</TabsTrigger>
               <TabsTrigger value="payment-history" className="text-xs sm:text-sm">Tarix</TabsTrigger>
             </TabsList>

             <div className="flex-1 overflow-hidden">
               {/* Tayyor buyurtmalar */}
               <TabsContent value="ready-orders" className="h-full overflow-hidden mt-0 p-0">
                   <ScrollArea className="h-full p-2 sm:p-4">
                   {errorOrders ? (
                       <div className="flex flex-col items-center justify-center h-full text-center text-destructive p-4">
                           <p className="mb-2">{errorOrders}</p>
                           <Button size="sm" onClick={() => window.location.reload()}>Qayta yuklash</Button>
                       </div>
                   ) : orders.length === 0 ? (
                       <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
                           <ShoppingCart className="mb-3 h-12 w-12 text-gray-400" />
                           <h3 className="text-base sm:text-lg font-medium">Tayyor buyurtmalar yo'q</h3>
                           <p className="text-xs sm:text-sm mt-1">Yangi buyurtmalar bu yerda ko'rinadi.</p>
                       </div>
                   ) : (
                       <div className="space-y-3">
                           {orders.map((order) => (
                               <Card
                                   key={`ready-${order.id}`} // Key'ni unikal qilish
                                   className={`cursor-pointer hover:shadow-md transition-all rounded-lg border ${
                                       selectedOrder?.id === order.id
                                           ? "border-primary ring-2 ring-primary ring-offset-2"
                                           : "border-border hover:border-muted-foreground/50"
                                   }`}
                                   onClick={() => handleSelectOrderForPayment(order)} // To'lov uchun tanlash
                               >
                                   <CardHeader className="p-3 sm:p-4 pb-2">
                                       <div className="flex justify-between items-start gap-2">
                                           <CardTitle className="text-sm sm:text-base font-semibold leading-tight">
                                               {order.order_type_display || "Noma'lum"}
                                               {order.order_type === "dine_in" && ` - ${order.table?.name ? `Stol ${order.table.name}` : "Stol"}`}
                                           </CardTitle>
                                           <Badge variant="secondary" className="text-xs px-1.5 py-0.5 whitespace-nowrap">#{order.id}</Badge>
                                       </div>
                                       <div className="text-xs sm:text-sm text-muted-foreground mt-1 space-y-0.5">
                                           {order.customer_name && (
                                               <p className="truncate" title={order.customer_name}>{order.customer_name}</p>
                                           )}
                                           <p>{formatTime(order.created_at)}</p>
                                       </div>
                                   </CardHeader>
                                   <CardFooter className="p-3 sm:p-4 pt-1 sm:pt-2 flex justify-between items-center">
                                       <div className="text-xs sm:text-sm text-muted-foreground">
                                           {Array.isArray(order.items) ? `${order.items.length} mahsulot` : "0 mahsulot"}
                                       </div>
                                       <div className="font-semibold text-sm sm:text-base">{parseFloat(order.final_price || 0).toLocaleString()} so'm</div>
                                   </CardFooter>
                               </Card>
                           ))}
                       </div>
                   )}
                   </ScrollArea>
               </TabsContent>

                {/* To'lov tarixi */}
               <TabsContent value="payment-history" className="h-full overflow-hidden mt-0 p-0">
                   <ScrollArea className="h-full p-2 sm:p-4">
                       {errorHistory ? (
                           <div className="flex flex-col items-center justify-center h-full text-center text-destructive p-4">
                               <p className="mb-2">{errorHistory}</p>
                               <Button size="sm" onClick={() => window.location.reload()}>Qayta yuklash</Button>
                           </div>
                       ) : paymentHistory.length === 0 ? (
                           <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
                               <Receipt className="mb-3 h-12 w-12 text-gray-400" />
                               <h3 className="text-base sm:text-lg font-medium">To'lov tarixi bo'sh</h3>
                               <p className="text-xs sm:text-sm mt-1">Yakunlangan to'lovlar bu yerda ko'rinadi.</p>
                           </div>
                       ) : (
                           <div className="space-y-3">
                               {paymentHistory.map((order) => (
                                   <Card
                                       key={`history-${order.id}`} // Key'ni unikal qilish
                                       className="hover:shadow-md transition-colors rounded-lg border border-border hover:border-muted-foreground/50 cursor-pointer" // <-- onClick qo'shildi
                                       onClick={() => handleViewHistoryDetails(order)} // <-- Ko'rish uchun tanlash
                                   >
                                       <CardHeader className="p-3 sm:p-4 pb-2">
                                           <div className="flex justify-between items-start gap-2">
                                               <CardTitle className="text-sm sm:text-base font-semibold leading-tight">
                                                   {order.order_type_display || "Noma'lum"}
                                                   {order.order_type === "dine_in" && ` - ${order.table?.name ? `Stol ${order.table.name}` : "Stol"}`}
                                               </CardTitle>
                                               <Badge variant="secondary" className="text-xs px-1.5 py-0.5 whitespace-nowrap">#{order.id}</Badge>
                                           </div>
                                           <div className="text-xs sm:text-sm text-muted-foreground mt-1 space-y-0.5">
                                               {order.customer_name && (
                                                   <p className="truncate" title={order.customer_name}>{order.customer_name}</p>
                                               )}
                                               <p>To'landi: {formatTime(order.payment?.timestamp || order.updated_at)}</p>
                                               <p>Usul: <span className="capitalize">{order.payment?.method || "N/A"}</span></p>
                                           </div>
                                       </CardHeader>
                                       <CardFooter className="p-3 sm:p-4 pt-1 sm:pt-2 flex justify-between items-center">
                                           <div className="text-xs sm:text-sm text-muted-foreground">
                                               {Array.isArray(order.items) ? `${order.items.length} mahsulot` : "0 mahsulot"}
                                           </div>
                                           <div className="font-semibold text-sm sm:text-base">{parseFloat(order.final_price || 0).toLocaleString()} so'm</div>
                                       </CardFooter>
                                   </Card>
                               ))}
                           </div>
                       )}
                   </ScrollArea>
               </TabsContent>
             </div>
           </Tabs>
         </div>

         {/* O'ng ustun: Tanlangan buyurtma tafsilotlari (To'lov uchun) */}
         <div className="md:col-span-2 flex flex-col overflow-hidden bg-background">
           {selectedOrder ? ( // Bu faqat to'lov uchun tanlangan buyurtmani ko'rsatadi
             <>
               <div className="p-4 border-b border-border shrink-0 h-16 flex justify-between items-center gap-4">
                 <h2 className="text-base sm:text-lg font-semibold truncate">
                   {selectedOrder.order_type_display || "Buyurtma"}
                 </h2>
                  <div className="flex items-center gap-2">
                     {selectedOrder.order_type === "dine_in" && (
                       <Badge variant="outline" className="whitespace-nowrap">Stol {selectedOrder.table?.name || selectedOrder.table_id || "?"}</Badge>
                      )}
                   <Badge variant="outline" className="whitespace-nowrap">ID: #{selectedOrder.id}</Badge>
                  </div>
               </div>

               {selectedOrder.customer_name && (
                  <div className="px-4 pt-2 pb-1 border-b border-border shrink-0 text-xs sm:text-sm text-muted-foreground">
                     <span>Mijoz: {selectedOrder.customer_name}</span>
                     {selectedOrder.customer_phone && <span> - {selectedOrder.customer_phone}</span>}
                 </div>
               )}

               <ScrollArea className="flex-1 p-4">
                 <div className="space-y-3">
                   {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 ? (
                     selectedOrder.items.map((item) => (
                       <div key={item.id} className="flex justify-between items-center gap-2 border-b border-border pb-3 last:border-0">
                         <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-md overflow-hidden bg-muted">
                             <img
                               src={item.product_details?.image_url || item.product_details?.image || "/placeholder-product.jpg"} // product_details.image_url ham tekshiriladi
                               alt={item.product_details?.name || "Mahsulot"}
                               className="w-full h-full object-cover"
                                onError={(e) => { e.currentTarget.src = "/placeholder-product.jpg" }}
                              />
                            </div>
                           <div className="flex-grow min-w-0">
                             <p className="font-medium text-sm sm:text-base truncate" title={item.product_details?.name || "Noma'lum"}>{item.product_details?.name || "Noma'lum mahsulot"}</p>
                             <p className="text-xs text-muted-foreground">{parseFloat(item.unit_price || 0).toLocaleString()} so'm</p>
                           </div>
                           <Badge variant="secondary" className="text-xs px-1.5 py-0.5">x{item.quantity || 0}</Badge>
                         </div>
                         <div className="text-right font-semibold text-sm sm:text-base w-24 shrink-0">
                           {parseFloat(item.total_price || 0).toLocaleString()} so'm
                         </div>
                       </div>
                     ))
                   ) : (
                     <div className="text-center text-muted-foreground py-10">Buyurtma elementlari topilmadi.</div>
                   )}
                 </div>
               </ScrollArea>

               <div className="border-t border-border p-4 shrink-0 bg-muted/20">
                 <div className="space-y-1 mb-4 text-sm sm:text-base">
                   <div className="flex justify-between font-semibold">
                     <span>Jami to'lov:</span>
                     <span>{parseFloat(selectedOrder.final_price || 0).toLocaleString()} so'm</span>
                   </div>
                 </div>
                 <Button
                   className="w-full h-12 text-base font-semibold"
                   size="lg"
                   onClick={handlePayment}
                   disabled={!!selectedOrder.payment}
                 >
                   {selectedOrder.payment ? "TO'LANGAN" : "To'lov Qilish"}
                 </Button>
               </div>
             </>
           ) : (
             <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-6">
               <Receipt className="mb-4 h-16 w-16 text-gray-400" />
               <h3 className="text-xl font-semibold">Buyurtma Tanlanmagan</h3>
               <p className="max-w-xs mt-2 text-sm">
                 Tafsilotlarni ko'rish va to'lov qilish uchun chap tomondagi ro'yxatdan buyurtmani tanlang.
               </p>
             </div>
           )}
         </div>
      </div>

      {/* To'lov Dialogi */}
      {selectedOrder && !selectedOrder.payment && (
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>To'lov (Buyurtma #{selectedOrder.id})</DialogTitle>
              <DialogDescription>To'lov usulini tanlang va ma'lumotlarni kiriting.</DialogDescription>
            </DialogHeader>
            {paymentError && (
               <div className="bg-destructive/10 border border-destructive text-destructive text-sm rounded-md p-3 my-3 text-center">
                 {paymentError}
               </div>
             )}
            <div className="py-4">
              <Tabs value={paymentMethod} onValueChange={setPaymentMethod}>
                <TabsList className="grid w-full grid-cols-3 h-11">
                  <TabsTrigger value="cash" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                    <DollarSign className="h-4 w-4" />
                    Naqd
                  </TabsTrigger>
                  <TabsTrigger value="card" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                    <CreditCard className="h-4 w-4" />
                    Karta
                  </TabsTrigger>
                  <TabsTrigger value="mobile" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                    <Smartphone className="h-4 w-4" />
                    Mobil
                  </TabsTrigger>
                </TabsList>

                 <TabsContent value="cash" className="mt-4 space-y-4">
                   <div className="space-y-1">
                     <Label htmlFor="total" className="text-xs text-muted-foreground">Jami summa</Label>
                     <Input id="total" value={`${parseFloat(selectedOrder.final_price || 0).toLocaleString()} so'm`} readOnly className="font-semibold text-base h-11 bg-muted/50"/>
                   </div>
                   <div className="space-y-1">
                     <Label htmlFor="received">Qabul qilingan summa*</Label>
                     <Input
                       id="received"
                       type="number"
                       placeholder="Summani kiriting"
                       value={cashReceived}
                       onChange={(e) => setCashReceived(e.target.value.replace(/\D/g, ''))}
                       className="h-11 text-base"
                       min="0"
                       required
                     />
                   </div>
                   {parseFloat(cashReceived) >= parseFloat(selectedOrder.final_price || 0) && (
                      <div className="space-y-1">
                       <Label htmlFor="change" className="text-xs text-muted-foreground">Qaytim</Label>
                       <Input id="change" value={`${calculateChange().toLocaleString()} so'm`} readOnly className="font-semibold text-base h-11 bg-muted/50"/>
                     </div>
                    )}
                 </TabsContent>

                 <TabsContent value="card" className="mt-4 space-y-4">
                     <div className="space-y-1">
                         <Label htmlFor="card-total" className="text-xs text-muted-foreground">Jami summa</Label>
                         <Input id="card-total" value={`${parseFloat(selectedOrder.final_price || 0).toLocaleString()} so'm`} readOnly className="font-semibold text-base h-11 bg-muted/50"/>
                     </div>
                   <div className="text-center text-muted-foreground p-4 border rounded-md bg-muted/50">
                      <CreditCard className="mx-auto h-8 w-8 mb-2 text-primary" />
                     <p className="text-sm">Iltimos, to'lovni POS terminal orqali amalga oshiring.</p>
                   </div>
                 </TabsContent>

                 <TabsContent value="mobile" className="mt-4 space-y-4">
                   <div className="space-y-1">
                     <Label htmlFor="mobile-total" className="text-xs text-muted-foreground">Jami summa</Label>
                     <Input
                       id="mobile-total"
                       value={`${parseFloat(selectedOrder.final_price || 0).toLocaleString()} so'm`}
                       readOnly
                       className="font-semibold text-base h-11 bg-muted/50"
                     />
                   </div>
                   <div className="text-center space-y-3">
                     <p className="text-sm text-muted-foreground">Mobil to'lov tizimini tanlang*</p>
                     <div className="grid grid-cols-3 gap-2 sm:gap-3">
                         {["Payme", "Click", "Apelsin"].map((provider) => (
                             <Button
                                 key={provider}
                                 variant={selectedMobileProvider === provider ? "default" : "outline"}
                                 onClick={() => setSelectedMobileProvider(provider)}
                                 className="h-11 text-sm"
                             >
                                 {provider}
                             </Button>
                         ))}
                     </div>
                   </div>
                 </TabsContent>
              </Tabs>
            </div>
            <DialogFooter className="mt-2">
              <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                Bekor qilish
              </Button>
              <Button onClick={handleCompletePayment}>To'lovni Yakunlash</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Chek Ko'rsatish Dialogi */}
      {selectedOrder && selectedOrder.payment && (
         <Dialog open={showReceiptDialog} onOpenChange={(open) => {
             // Agar dialog yopilsa va yakunlash jarayoni ketmayotgan bo'lsa state'ni tozalash
             if (!open && !isFinalizing) {
                 setSelectedOrder(null);
                 setCashReceived("");
                 setSelectedMobileProvider("");
                 setPaymentMethod("cash");
             }
             setShowReceiptDialog(open);
         }}>
           <DialogContent className="sm:max-w-sm">
             <DialogHeader>
               <DialogTitle>Chek (Buyurtma #{selectedOrder.id})</DialogTitle>
               <DialogDescription>To'lov muvaffaqiyatli amalga oshirildi.</DialogDescription>
             </DialogHeader>
              <ScrollArea className="max-h-[60vh] my-4">
                 <div className="p-4 border border-dashed border-foreground/50 rounded-md font-mono text-xs leading-relaxed">
                   {/* Chek kontenti (o'zgarishsiz) */}
                   <div className="text-center mb-3">
                     <h3 className="font-bold text-sm uppercase">SmartResto</h3>
                     <p>Toshkent sh., Chilonzor t.</p>
                     <p>Tel: +998 71 123 45 67</p>
                     <p>INN: 123456789</p>
                   </div>
                   <Separator className="border-dashed border-foreground/50 my-2"/>
                   <div className="mb-2">
                     <p>Kassir: {selectedOrder.payment?.processed_by_name || "Noma'lum"}</p>
                     <p>Sana: {new Date(selectedOrder.payment?.timestamp || Date.now()).toLocaleString("uz-UZ")}</p>
                     <p>Chek #: {selectedOrder.payment?.id || selectedOrder.id}</p>
                      <p>Buyurtma turi: <span className="capitalize">{selectedOrder.order_type_display || selectedOrder.order_type}</span></p>
                      {selectedOrder.table && <p>Stol: {selectedOrder.table.name}</p>}
                   </div>
                   <Separator className="border-dashed border-foreground/50 my-2"/>
                   <div className="space-y-1 mb-2">
                      {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 ? (
                       selectedOrder.items.map((item) => (
                         <div key={item.id} className="grid grid-cols-[1fr_auto_auto] gap-1 items-start">
                            <span className="col-span-3 font-medium break-words">{item.product_details?.name || "Noma'lum"}</span>
                            <span className="text-right">{item.quantity || 0} x {parseFloat(item.unit_price || 0).toLocaleString()}</span>
                            <span>=</span>
                            <span className="text-right font-medium">{parseFloat(item.total_price || 0).toLocaleString()}</span>
                         </div>
                       ))
                     ) : (
                       <p className="text-center text-muted-foreground">Mahsulotlar yo'q</p>
                     )}
                   </div>
                   <Separator className="border-dashed border-foreground/50 my-2"/>
                   <div className="space-y-1">
                       <div className="flex justify-between">
                           <span>Mahsulotlar jami:</span>
                           <span>{selectedOrder.items?.reduce((sum, i) => sum + parseFloat(i.total_price || 0), 0).toLocaleString()} so'm</span>
                       </div>
                       <div className="flex justify-between font-bold text-sm pt-1">
                           <span>JAMI TO'LOV:</span>
                           <span>{parseFloat(selectedOrder.final_price || 0).toLocaleString()} so'm</span>
                       </div>
                   </div>
                   <Separator className="border-dashed border-foreground/50 my-2"/>
                   <div className="space-y-1">
                       <div className="flex justify-between">
                           <span>To'lov usuli:</span>
                           <span className="capitalize">{selectedOrder.payment?.method || "N/A"}</span>
                       </div>
                        {selectedOrder.payment?.method === 'cash' && (
                            <>
                             <div className="flex justify-between">
                                 <span>Naqd berildi:</span>
                                 <span>{parseFloat(selectedOrder.payment?.received_amount || 0).toLocaleString()} so'm</span>
                             </div>
                             <div className="flex justify-between">
                                 <span>Qaytim:</span>
                                 <span>{parseFloat(selectedOrder.payment?.change_amount || 0).toLocaleString()} so'm</span>
                             </div>
                            </>
                        )}
                         {selectedOrder.payment?.method === 'mobile' && (
                             <div className="flex justify-between">
                               <span>Provayder:</span>
                               <span>{selectedOrder.payment?.mobile_provider || "N/A"}</span>
                             </div>
                         )}
                   </div>
                   <Separator className="border-dashed border-foreground/50 my-2"/>
                   <div className="text-center mt-3">
                     <p>Xaridingiz uchun rahmat!</p>
                     <p>Yana keling!</p>
                   </div>
                 </div>
              </ScrollArea>
             <DialogFooter>
               <Button className="w-full" onClick={handlePrintReceipt} disabled={isFinalizing}>
                 {isFinalizing ? (
                     <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                           <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                           <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                         Yakunlanmoqda...
                     </>
                 ) : (
                     <>
                         <Printer className="mr-2 h-4 w-4" />
                         Chop etish va Yakunlash
                     </>
                 )}
               </Button>
             </DialogFooter>
           </DialogContent>
         </Dialog>
       )}

      {/* Tarix Tafsilotlarini Ko'rish Dialogi (YANGI) */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
            <DialogContent className="sm:max-w-lg"> {/* Kengroq dialog */}
                <DialogHeader>
                    <DialogTitle>Buyurtma Tafsilotlari (#{viewingOrderDetails?.id})</DialogTitle>
                    <DialogClose asChild>
                        <Button variant="ghost" size="icon" className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                            <X className="h-4 w-4" />
                            <span className="sr-only">Yopish</span>
                        </Button>
                    </DialogClose>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] my-4 pr-6"> {/* Scroll qo'shildi */}
                    {viewingOrderDetails ? (
                        <div className="space-y-4">
                            {/* Asosiy ma'lumotlar */}
                            <Card>
                                <CardHeader className="p-3 bg-muted/50">
                                    <CardTitle className="text-sm font-semibold">Asosiy ma'lumotlar</CardTitle>
                                </CardHeader>
                                <CardContent className="p-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                    <p><strong>ID:</strong> {viewingOrderDetails.id}</p>
                                    <p><strong>Turi:</strong> {viewingOrderDetails.order_type_display}</p>
                                    <p><strong>Holati:</strong> {viewingOrderDetails.payment ? "To'langan" : "Noma'lum"}</p>
                                    <p><strong>Stol:</strong> {viewingOrderDetails.table?.name || "Yo'q"}</p>
                                    <p><strong>Yaratildi:</strong> {new Date(viewingOrderDetails.created_at).toLocaleString("uz-UZ")}</p>
                                    {viewingOrderDetails.payment?.timestamp && <p><strong>To'landi:</strong> {new Date(viewingOrderDetails.payment.timestamp).toLocaleString("uz-UZ")}</p>}
                                    <p><strong>Jami:</strong> {parseFloat(viewingOrderDetails.final_price || 0).toLocaleString()} so'm</p>
                                    {viewingOrderDetails.payment?.method && <p><strong>To'lov usuli:</strong> <span className="capitalize">{viewingOrderDetails.payment.method}</span></p>}
                                    {viewingOrderDetails.payment?.processed_by_name && <p><strong>Kassir:</strong> {viewingOrderDetails.payment.processed_by_name}</p>}
                                </CardContent>
                            </Card>
                            {/* Mijoz ma'lumotlari */}
                            {(viewingOrderDetails.customer_name || viewingOrderDetails.customer_phone) && (
                                <Card>
                                    <CardHeader className="p-3 bg-muted/50"><CardTitle className="text-sm font-semibold">Mijoz</CardTitle></CardHeader>
                                    <CardContent className="p-3 text-xs">
                                        {viewingOrderDetails.customer_name && <p><strong>Ism:</strong> {viewingOrderDetails.customer_name}</p>}
                                        {viewingOrderDetails.customer_phone && <p><strong>Telefon:</strong> {viewingOrderDetails.customer_phone}</p>}
                                    </CardContent>
                                </Card>
                            )}
                            {/* Buyurtma tarkibi */}
                            <Card>
                                <CardHeader className="p-3 bg-muted/50"><CardTitle className="text-sm font-semibold">Tarkibi</CardTitle></CardHeader>
                                <CardContent className="p-0">
                                    {Array.isArray(viewingOrderDetails.items) && viewingOrderDetails.items.length > 0 ? (
                                        <ul className="divide-y">
                                            {viewingOrderDetails.items.map(item => (
                                                <li key={item.id} className="flex items-center justify-between p-3 gap-2 text-xs">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <img
                                                            src={item.product_details?.image_url || item.product_details?.image || "/placeholder-product.jpg"}
                                                            alt={item.product_details?.name || ""}
                                                            className="w-8 h-8 object-cover rounded shrink-0"
                                                            onError={(e) => { e.currentTarget.src = "/placeholder-product.jpg"; }}
                                                        />
                                                        <span className="font-medium truncate">{item.product_details?.name || "Noma'lum"}</span>
                                                        <span className="text-muted-foreground">(x{item.quantity})</span>
                                                    </div>
                                                    <span className="font-semibold whitespace-nowrap">{parseFloat(item.total_price || 0).toLocaleString()} so'm</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : <p className="p-4 text-center text-muted-foreground text-xs">Tarkibi topilmadi.</p>}
                                </CardContent>
                            </Card>
                        </div>
                    ) : (
                        <p className="text-center text-muted-foreground py-6">Ma'lumotlar topilmadi.</p>
                    )}
                </ScrollArea>
                <DialogFooter className="mt-4 pt-4 border-t">
                    <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>Yopish</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

    </div> // Asosiy div tugashi
  )
}