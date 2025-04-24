"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, CreditCard, DollarSign, LogOut, Printer, Receipt, ShoppingCart, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area" // ScrollBar import qilindi
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [cashReceived, setCashReceived] = useState("")
  const [selectedMobileProvider, setSelectedMobileProvider] = useState("")
  const [showReceiptDialog, setShowReceiptDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [errorOrders, setErrorOrders] = useState("")
  const [errorHistory, setErrorHistory] = useState("")
  const [paymentError, setPaymentError] = useState("")

  // Helper function to get token securely
  const getToken = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("token");
    }
    return null;
  };

  useEffect(() => {
    setIsLoading(true)
    const token = getToken()
    if (!token) {
      // Redirect immediately if no token
      router.replace("/auth") // Use replace to avoid history entry
      toast.error("Sessiya topilmadi. Iltimos, qayta kiring.")
      setIsLoading(false) // Stop loading as we are redirecting
      return // Exit useEffect
    }

    let isMounted = true; // Flag to check if component is still mounted

    const fetchOrders = axios.get("https://oshxonacopy.pythonanywhere.com/api/cashier/orders-ready/", {
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
    });

    const fetchHistory = axios.get("https://oshxonacopy.pythonanywhere.com/api/cashier/payment-history/", {
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
    });

    Promise.all([fetchOrders, fetchHistory])
      .then(([ordersRes, historyRes]) => {
        if (isMounted) {
          console.log("Tayyor buyurtmalar API javobi:", ordersRes.data)
          setOrders(ordersRes.data || [])
          if (ordersRes.data?.length === 0) {
            // Toast only if there are no errors yet
             if (!errorOrders) toast.info("Hozirda tayyor buyurtmalar mavjud emas.")
          }

          console.log("To'langan buyurtmalar tarixi API javobi:", historyRes.data)
          setPaymentHistory(historyRes.data || [])
           if (historyRes.data?.length === 0) {
              // Toast only if there are no errors yet
              if (!errorHistory) toast.info("To'langan buyurtmalar tarixi mavjud emas.")
          }
        }
      })
      .catch((err) => {
         if (isMounted) {
            console.error("Ma'lumotlarni yuklashda xato:", err)
            // Check for 401 Unauthorized specifically
            if (err.response?.status === 401) {
                toast.error("Sessiya muddati tugagan yoki yaroqsiz. Iltimos, qayta kiring.");
                localStorage.removeItem("token"); // Clear invalid token
                router.replace("/auth");
            } else {
                // Handle other errors generically for now
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
      });

      // Cleanup function to set isMounted to false when the component unmounts
      return () => {
          isMounted = false;
      };

  }, [router]) // router dependency is okay here

  const formatTime = (dateString) => {
     if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      // Check if the date is valid
      if (isNaN(date.getTime())) {
         return "Noto'g'ri sana";
      }
      return date.toLocaleTimeString("uz-UZ", { // Using uz-UZ locale
        hour: "2-digit",
        minute: "2-digit",
        // second: '2-digit', // Optional: include seconds if needed
      });
    } catch (e) {
      console.error("Sana formatlashda xato:", e);
      return "Xatolik";
    }
  };


  const handleSelectOrder = (order) => {
    if (!order) return;
    setSelectedOrder(order)
    // Removed the toast message for selecting, can be noisy
    // toast.info(`Buyurtma #${order.id} tanlandi`)
     // Reset payment dialog state when selecting a new order
    setShowPaymentDialog(false);
    setPaymentMethod("cash");
    setCashReceived("");
    setSelectedMobileProvider("");
    setPaymentError("");
  }

  const handlePayment = () => {
    if (selectedOrder) {
        // Reset previous errors and state before opening
        setPaymentError("");
        setPaymentMethod("cash"); // Default to cash
        setCashReceived("");
        setSelectedMobileProvider("");
        setShowPaymentDialog(true);
    } else {
      toast.warn("Iltimos, avval to'lov uchun buyurtmani tanlang")
    }
  }

  const handleCompletePayment = async () => {
    if (!selectedOrder) {
      toast.error("Buyurtma tanlanmagan!")
      return
    }

    setPaymentError("") // Clear previous errors
    const token = getToken()
    if (!token) {
      setPaymentError("Avtorizatsiya xatosi. Iltimos, qayta kiring.")
      router.replace("/auth") // Redirect to login
      toast.error("Avtorizatsiya tokeni topilmadi!")
      return
    }

    // Validate payment method
    if (!paymentMethod || !["cash", "card", "mobile"].includes(paymentMethod)) {
      const errorMsg = "Iltimos, to'g'ri to'lov usulini tanlang."
      setPaymentError(errorMsg)
      toast.error(errorMsg)
      return
    }

    // Validate mobile provider if method is mobile
    if (paymentMethod === "mobile" && !selectedMobileProvider) {
      const errorMsg = "Mobil to'lov uchun provayderni tanlang (Payme, Click, Apelsin)."
      setPaymentError(errorMsg)
      toast.error(errorMsg)
      return
    }

    // Validate cash received if method is cash
    const finalPrice = parseFloat(selectedOrder.final_price || 0);
    const received = parseFloat(cashReceived);
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
      // Only send received_amount if method is cash
      ...(paymentMethod === "cash" && { received_amount: received }),
      // Only send mobile_provider if method is mobile
      ...(paymentMethod === "mobile" && { mobile_provider: selectedMobileProvider }),
    }

    // Use toast.promise for better UX
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

       // Update UI: Remove paid order from 'ready' list and add to 'history'
       const paidOrder = { ...selectedOrder, payment: response.data }; // Update order with payment details
       setOrders((prevOrders) => prevOrders.filter((order) => order.id !== selectedOrder.id));
       setPaymentHistory((prevHistory) => [paidOrder, ...prevHistory]); // Add to the beginning of history

      setShowPaymentDialog(false)
       setSelectedOrder(paidOrder); // Keep the paid order selected to show receipt
      setShowReceiptDialog(true) // Show receipt dialog immediately

    })
    .catch((err) => {
      console.error("To'lov xatosi:", err)
      const errorMessage =
        err.response?.data?.detail ||
        (err.response?.data && typeof err.response.data === 'object' ? JSON.stringify(err.response.data) : null) || // More detailed error
        "To'lovda noma'lum xatolik.";
      setPaymentError(errorMessage)
      // toast.error already handled by toast.promise
    });
  }

   // Chekni "chop etish" (hozircha faqat dialog'ni yopadi)
  const handlePrintReceipt = () => {
    console.log("Chek chop etish funksiyasi chaqirildi (simulyatsiya)");
     // Haqiqiy printerga yuborish logikasi bu yerga qo'shiladi
     // Masalan, window.print() yoki maxsus printer kutubxonasi
    toast.info(`Buyurtma #${selectedOrder?.id} uchun chek "chop etildi".`)
    setShowReceiptDialog(false) // Dialog'ni yopish

     // Agar dine_in bo'lsa stolni bo'shatish haqida xabar (opsional)
    if (selectedOrder?.order_type === "dine_in") {
        toast.info(`Stol ${selectedOrder.table?.name || selectedOrder.table_id || ''} endi bo'sh`);
         // Bu yerda stol statusini backendda yangilash kerak bo'lishi mumkin
    }

    // Tanlangan buyurtmani tozalash, kassir keyingi buyurtmaga o'tishi uchun
    setSelectedOrder(null)
     setCashReceived(""); // Reset cash input
     setSelectedMobileProvider("");
     setPaymentMethod("cash");
  }

  const calculateChange = () => {
    if (paymentMethod !== 'cash' || !cashReceived || !selectedOrder?.final_price) return 0;
    const received = parseFloat(cashReceived);
    const price = parseFloat(selectedOrder.final_price);
    if (isNaN(received) || isNaN(price) || received < price) return 0;
    return received - price;
  }

  if (isLoading) {
    return (
       <div className="flex h-screen items-center justify-center bg-muted/40">
         {/* Yaxshiroq Loading indikatori */}
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
     // Asosiy layout flex container
    <div className="flex h-screen flex-col bg-muted/40">
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
        theme="colored" // Changed theme
      />

        {/* Header */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-4 sm:px-6 shrink-0">
         <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="outline" size="icon" className="shrink-0" onClick={() => router.push("/pos")}> {/* Changed to outline */}
            <ArrowLeft className="h-5 w-5" />
             <span className="sr-only">Ortga (POS)</span>
          </Button>
          <h1 className="text-lg sm:text-xl font-bold">Kassa</h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
           {/* Kelajakda foydalanuvchi nomi/avatar qo'shilishi mumkin */}
           {/* <span className="text-sm text-muted-foreground hidden sm:inline">Salom, Kassir!</span> */}
          <Button
            variant="outline" // Changed to outline
            size="icon"
             className="shrink-0"
            onClick={() => {
              localStorage.removeItem("token")
              router.replace("/auth") // Use replace
              toast.info("Tizimdan muvaffaqiyatli chiqildi")
            }}
             title="Chiqish"
          >
            <LogOut className="h-5 w-5" />
             <span className="sr-only">Chiqish</span>
          </Button>
        </div>
      </header>

        {/* Asosiy kontent uchun Grid */}
        {/* Changed flex to grid for responsiveness */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-0 overflow-hidden">

         {/* Chap ustun: Buyurtmalar ro'yxati */}
         {/* Orders List Column */}
         {/* Added flex flex-col for height management */}
         <div className="md:col-span-1 border-r border-border flex flex-col overflow-hidden">
           <Tabs defaultValue="ready-orders" className="flex-1 flex flex-col">
             {/* TabsList - shrink-0 ensures it doesn't grow */}
             <TabsList className="grid w-full grid-cols-2 shrink-0 h-11 sticky top-0 bg-background z-10"> {/* Added sticky */}
               <TabsTrigger value="ready-orders" className="text-xs sm:text-sm">Tayyor</TabsTrigger>
               <TabsTrigger value="payment-history" className="text-xs sm:text-sm">Tarix</TabsTrigger>
             </TabsList>

             {/* Tayyor buyurtmalar uchun kontent */}
             <TabsContent value="ready-orders" className="flex-1 overflow-hidden mt-0">
               {/* Added flex-1 and overflow-hidden */}
                 <ScrollArea className="h-full p-2 sm:p-4"> {/* Changed height to h-full */}
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
                                 key={order.id}
                                 className={`cursor-pointer hover:shadow-md transition-all rounded-lg border ${ // Added rounded-lg
                                     selectedOrder?.id === order.id
                                         ? "border-primary ring-2 ring-primary ring-offset-2" // Highlight selected
                                         : "border-border hover:border-muted-foreground/50"
                                 }`}
                                 onClick={() => handleSelectOrder(order)}
                             >
                                 <CardHeader className="p-3 sm:p-4 pb-2">
                                     <div className="flex justify-between items-start gap-2">
                                         <CardTitle className="text-sm sm:text-base font-semibold leading-tight"> {/* Adjusted font size */}
                                             {order.order_type_display || "Noma'lum"}
                                             {order.order_type === "dine_in" && ` - ${order.table?.name ? `Stol ${order.table.name}` : "Stol"}`}
                                         </CardTitle>
                                         <Badge variant="secondary" className="text-xs px-1.5 py-0.5 whitespace-nowrap">#{order.id}</Badge> {/* Adjusted badge */}
                                     </div>
                                     <div className="text-xs sm:text-sm text-muted-foreground mt-1 space-y-0.5">
                                          {/* Show customer only if available */}
                                         {order.customer_name && (
                                             <p className="truncate" title={order.customer_name}>{order.customer_name}</p>
                                         )}
                                         {/* Always show time */}
                                         <p>{formatTime(order.created_at)}</p>
                                     </div>
                                 </CardHeader>
                                 <CardFooter className="p-3 sm:p-4 pt-1 sm:pt-2 flex justify-between items-center">
                                     <div className="text-xs sm:text-sm text-muted-foreground">
                                         {/* Ensure items is an array */}
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

             {/* To'lov tarixi uchun kontent */}
              <TabsContent value="payment-history" className="flex-1 overflow-hidden mt-0">
                 {/* Added flex-1 and overflow-hidden */}
                 <ScrollArea className="h-full p-2 sm:p-4"> {/* Changed height to h-full */}
                     {errorHistory ? (
                         <div className="flex flex-col items-center justify-center h-full text-center text-destructive p-4">
                             <p className="mb-2">{errorHistory}</p>
                             <Button size="sm" onClick={() => window.location.reload()}>Qayta yuklash</Button>
                         </div>
                     ) : paymentHistory.length === 0 ? (
                         <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
                             <Receipt className="mb-3 h-12 w-12 text-gray-400" /> {/* Changed icon */}
                             <h3 className="text-base sm:text-lg font-medium">To'lov tarixi bo'sh</h3>
                              <p className="text-xs sm:text-sm mt-1">Yakunlangan to'lovlar bu yerda ko'rinadi.</p>
                         </div>
                     ) : (
                         <div className="space-y-3">
                             {paymentHistory.map((order) => (
                                 <Card
                                     key={order.id}
                                     className="cursor-pointer hover:shadow-md transition-colors rounded-lg border border-border hover:border-muted-foreground/50" // No selection highlight for history
                                     // onClick={() => handleSelectOrder(order)} // Don't select history items for payment
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
                                              {/* Use payment timestamp if available, otherwise fallback */}
                                             <p>To'landi: {formatTime(order.payment?.timestamp || order.updated_at)}</p>
                                              <p>Usul: <span className="capitalize">{order.payment?.method || "N/A"}</span></p> {/* Capitalize method */}
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
           </Tabs>
         </div>

         {/* O'ng ustun: Buyurtma tafsilotlari */}
         {/* Order Details Column */}
         {/* Added flex flex-col for height management */}
         <div className="md:col-span-2 flex flex-col overflow-hidden bg-background"> {/* Ensure background for contrast */}
           {selectedOrder ? (
             <>
               {/* Buyurtma tafsilotlari header */}
               <div className="p-4 border-b border-border shrink-0 h-16 flex justify-between items-center gap-4">
                 <h2 className="text-base sm:text-lg font-semibold truncate">
                   {selectedOrder.order_type_display || "Buyurtma"}
                    {/* Ko'proq joy uchun Stol nomini alohida Badge ga chiqarish mumkin */}
                 </h2>
                  <div className="flex items-center gap-2">
                     {selectedOrder.order_type === "dine_in" && (
                       <Badge variant="outline" className="whitespace-nowrap">Stol {selectedOrder.table?.name || selectedOrder.table_id || "?"}</Badge>
                      )}
                   <Badge variant="outline" className="whitespace-nowrap">ID: #{selectedOrder.id}</Badge>
                  </div>
               </div>

               {/* Buyurtma mijoz ma'lumotlari (agar mavjud bo'lsa) */}
               {selectedOrder.customer_name && (
                  <div className="px-4 pt-2 pb-1 border-b border-border shrink-0 text-xs sm:text-sm text-muted-foreground">
                     <span>Mijoz: {selectedOrder.customer_name}</span>
                     {selectedOrder.customer_phone && <span> - {selectedOrder.customer_phone}</span>}
                 </div>
               )}

               {/* Buyurtma elementlari uchun ScrollArea */}
               <ScrollArea className="flex-1 p-4">
                 {/* Card olib tashlandi, to'g'ridan-to'g'ri list */}
                 <div className="space-y-3">
                   {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 ? (
                     selectedOrder.items.map((item) => (
                       <div key={item.id} className="flex justify-between items-center gap-2 border-b border-border pb-3 last:border-0">
                         <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                           {/* Rasm yoki placeholder */}
                            <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-md overflow-hidden bg-muted">
                             <img
                               src={item.product_details?.image || "/placeholder-product.jpg"} // Placeholder
                               alt={item.product_details?.name || "Mahsulot"}
                               className="w-full h-full object-cover"
                                onError={(e) => { e.currentTarget.src = "/placeholder-product.jpg"; }}
                              />
                            </div>
                            {/* Nomi va miqdori */}
                           <div className="flex-grow min-w-0">
                             <p className="font-medium text-sm sm:text-base truncate" title={item.product_details?.name || "Noma'lum"}>{item.product_details?.name || "Noma'lum mahsulot"}</p>
                             <p className="text-xs text-muted-foreground">{parseFloat(item.unit_price || 0).toLocaleString()} so'm</p>
                           </div>
                           <Badge variant="secondary" className="text-xs px-1.5 py-0.5">x{item.quantity || 0}</Badge>
                         </div>
                          {/* Narxi */}
                         <div className="text-right font-semibold text-sm sm:text-base w-24 shrink-0"> {/* Added width */}
                           {parseFloat(item.total_price || 0).toLocaleString()} so'm
                         </div>
                       </div>
                     ))
                   ) : (
                     <div className="text-center text-muted-foreground py-10">Buyurtma elementlari topilmadi.</div>
                   )}
                 </div>
               </ScrollArea>

               {/* To'lov qismi (Footer) */}
               <div className="border-t border-border p-4 shrink-0 bg-muted/20"> {/* Added background */}
                 <div className="space-y-1 mb-4 text-sm sm:text-base">
                   {/* Xizmat haqi yoki boshqa detallar qo'shilishi mumkin */}
                   <div className="flex justify-between font-semibold">
                     <span>Jami to'lov:</span>
                     <span>{parseFloat(selectedOrder.final_price || 0).toLocaleString()} so'm</span>
                   </div>
                 </div>
                 {/* <Separator className="my-4" /> */}
                 <Button
                   className="w-full h-12 text-base font-semibold" // Made bigger
                   size="lg"
                   onClick={handlePayment}
                   disabled={!!selectedOrder.payment} // Disable if already paid
                 >
                   {selectedOrder.payment ? "To'langan" : "To'lov Qilish"}
                 </Button>
               </div>
             </>
           ) : (
               // Agar buyurtma tanlanmagan bo'lsa ko'rsatiladigan placeholder
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
       {/* Show only if order is selected AND not already paid */}
      {selectedOrder && !selectedOrder.payment && (
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="sm:max-w-md"> {/* Adjusted width */}
            <DialogHeader>
              <DialogTitle>To'lov (Buyurtma #{selectedOrder.id})</DialogTitle>
              <DialogDescription>To'lov usulini tanlang va ma'lumotlarni kiriting.</DialogDescription>
            </DialogHeader>
            {/* Error message display */}
             {paymentError && (
               <div className="bg-destructive/10 border border-destructive text-destructive text-sm rounded-md p-3 my-3 text-center">
                 {paymentError}
               </div>
             )}
            <div className="py-4">
              <Tabs value={paymentMethod} onValueChange={setPaymentMethod}> {/* Controlled Tabs */}
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

                {/* Naqd to'lov */}
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
                        onChange={(e) => setCashReceived(e.target.value.replace(/\D/g, ''))} // Only allow digits
                        className="h-11 text-base"
                        min="0"
                        required
                      />
                   </div>
                   {/* Show change only if cashReceived is valid and greater than or equal to finalPrice */}
                   {parseFloat(cashReceived) >= parseFloat(selectedOrder.final_price || 0) && (
                      <div className="space-y-1">
                       <Label htmlFor="change" className="text-xs text-muted-foreground">Qaytim</Label>
                       <Input id="change" value={`${calculateChange().toLocaleString()} so'm`} readOnly className="font-semibold text-base h-11 bg-muted/50"/>
                     </div>
                    )}
                 </TabsContent>

                 {/* Karta to'lov */}
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

                 {/* Mobil to'lov */}
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
                     {/* Buttons grid for mobile payment providers */}
                      <div className="grid grid-cols-3 gap-2 sm:gap-3">
                         {["Payme", "Click", "Apelsin"].map((provider) => (
                             <Button
                                 key={provider}
                                 variant={selectedMobileProvider === provider ? "default" : "outline"}
                                 onClick={() => setSelectedMobileProvider(provider)}
                                 className="h-11 text-sm" // Adjusted height
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
       {/* Show only if order is selected AND payment details exist */}
       {selectedOrder && selectedOrder.payment && (
         <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
           <DialogContent className="sm:max-w-sm"> {/* Adjusted width for receipt */}
             <DialogHeader>
               <DialogTitle>Chek (Buyurtma #{selectedOrder.id})</DialogTitle>
               <DialogDescription>To'lov muvaffaqiyatli amalga oshirildi.</DialogDescription>
             </DialogHeader>
             {/* Chek ko'rinishi uchun ScrollArea */}
              <ScrollArea className="max-h-[60vh] my-4">
                 <div className="p-4 border border-dashed border-foreground/50 rounded-md font-mono text-xs leading-relaxed"> {/* Mono font for receipt */}
                   <div className="text-center mb-3">
                     <h3 className="font-bold text-sm uppercase">SmartResto</h3>
                     <p>Toshkent sh., Chilonzor t.</p>
                     <p>Tel: +998 71 123 45 67</p>
                     <p>INN: 123456789</p>
                   </div>
                   <Separator className="border-dashed border-foreground/50 my-2"/>
                   <div className="mb-2">
                     <p>Kassir: {selectedOrder.payment?.processed_by_name || "Noma'lum"}</p> {/* Show cashier name */}
                     <p>Sana: {new Date(selectedOrder.payment?.timestamp || Date.now()).toLocaleString("uz-UZ")}</p>
                     <p>Chek #: {selectedOrder.payment?.id || selectedOrder.id}</p> {/* Use payment ID if available */}
                      <p>Buyurtma turi: <span className="capitalize">{selectedOrder.order_type_display || selectedOrder.order_type}</span></p>
                      {selectedOrder.table && <p>Stol: {selectedOrder.table.name}</p>}
                   </div>
                   <Separator className="border-dashed border-foreground/50 my-2"/>
                   {/* Mahsulotlar ro'yxati */}
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
                    {/* Jami hisob-kitob */}
                   <div className="space-y-1">
                       <div className="flex justify-between">
                           <span>Mahsulotlar jami:</span>
                           <span>{selectedOrder.items?.reduce((sum, i) => sum + parseFloat(i.total_price || 0), 0).toLocaleString()} so'm</span>
                       </div>
                        {/* Xizmat haqi (agar mavjud bo'lsa) */}
                        {/*
                        <div className="flex justify-between">
                           <span>Xizmat haqi (10%):</span>
                           <span>... so'm</span>
                       </div>
                       */}
                       <div className="flex justify-between font-bold text-sm pt-1">
                           <span>JAMI TO'LOV:</span>
                           <span>{parseFloat(selectedOrder.final_price || 0).toLocaleString()} so'm</span>
                       </div>
                   </div>
                   <Separator className="border-dashed border-foreground/50 my-2"/>
                    {/* To'lov usuli va qaytim */}
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
               <Button className="w-full" onClick={handlePrintReceipt}>
                 <Printer className="mr-2 h-4 w-4" />
                 Chop etish va Yakunlash
               </Button>
             </DialogFooter>
           </DialogContent>
         </Dialog>
       )}

    </div> // Asosiy div tugashi
  )
}