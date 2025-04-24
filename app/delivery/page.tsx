"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Bell, Check, Clock, LogOut, MapPin, Phone, Truck, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import { Textarea } from "@/components/ui/textarea"
import axios from "axios"
import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

export default function DeliveryPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("ready")
  const [orders, setOrders] = useState([])
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showOrderDetailsDialog, setShowOrderDetailsDialog] = useState(false)
  const [showDeliveryCompleteDialog, setShowDeliveryCompleteDialog] = useState(false)
  const [deliveryNote, setDeliveryNote] = useState("")
  const [cashReceived, setCashReceived] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    setIsLoading(true)
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/auth")
      toast.info("Tizimga kirish uchun autentifikatsiya talab qilinadi")
      setIsLoading(false)
      return
    }

    axios
      .get("https://oshxonacopy.pythonanywhere.com/api/orders/", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })
      .then((res) => {
        console.log("API javobi:", res.data)
        const data = Array.isArray(res.data) ? res.data : []
        const deliveryOrders = data
          .filter((order) => order.order_type === "delivery")
          .map((order) => ({
            id: order.id,
            customer: {
              name: order.customer_name || "Noma'lum",
              phone: order.customer_phone || "Noma'lum",
              address: order.customer_address || "Noma'lum",
            },
            items: order.items
              ? order.items.map((item) => ({
                  id: item.id,
                  name: item.product_details?.name || "Noma'lum mahsulot",
                  quantity: item.quantity,
                  price: parseFloat(item.unit_price) || 0,
                  image_url: item.product_details?.image_url || "",
                }))
              : [],
            total: parseFloat(order.final_price) || 0,
            timestamp: new Date(order.created_at),
            status:
              order.status_display === "Yetkazildi"
                ? "delivered"
                : order.status_display === "Tayyor"
                ? "ready"
                : order.status_display === "Yetkazilmoqda"
                ? "delivering"
                : "delivered",
            paymentMethod: order.payment?.method || "cash",
            isPaid: !!order.payment,
            item_count: order.item_count || 0,
          }))
        setOrders(deliveryOrders)
        if (deliveryOrders.length === 0) {
          toast.warn("Hozirda yetkazib berish buyurtmalari mavjud emas")
        }
      })
      .catch((err) => {
        console.error("Buyurtmalarni yuklashda xato:", err)
        const errorMessage = err.response?.data?.message || err.message
        setError("Buyurtmalarni yuklashda xato yuz berdi: " + errorMessage)
        toast.error("Buyurtmalarni yuklashda xato yuz berdi")
        setOrders([])
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [router])

  const filteredOrders = orders.filter((order) => {
    if (activeTab === "ready") return order.status === "ready"
    if (activeTab === "delivering") return order.status === "delivering"
    if (activeTab === "delivered") return order.status === "delivered"
    return true
  })

  const handleStartDelivery = async (orderId) => {
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        setError("Autentifikatsiya tokeni topilmadi")
        toast.error("Autentifikatsiya tokeni topilmadi")
        return
      }

      await axios.post(
        `https://oshxonacopy.pythonanywhere.com/api/orders/${orderId}/start_delivery/`,
        {},
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      )

      setOrders(
        orders.map((order) =>
          order.id === orderId ? { ...order, status: "delivering" } : order
        )
      )
      toast.success(`Buyurtma #${orderId} yetkazish boshlandi!`)
    } catch (err) {
      console.error("Yetkazishni boshlashda xato:", err)
      const errorMessage = err.response?.data?.message || err.message
      setError("Yetkazishni boshlashda xato yuz berdi: " + errorMessage)
      toast.error("Yetkazishni boshlashda xato yuz berdi")
    }
  }

  const handleCompleteDelivery = async (orderId) => {
    const order = orders.find((o) => o.id === orderId)
    if (!order) {
      toast.warn("Buyurtma topilmadi")
      return
    }

    if (!order.isPaid && order.paymentMethod === "cash") {
      setSelectedOrder(order)
      setShowDeliveryCompleteDialog(true)
      toast.info(`Buyurtma #${orderId} uchun naqd to'lov qabul qilinadi`)
    } else {
      try {
        const token = localStorage.getItem("token")
        if (!token) {
          setError("Autentifikatsiya tokeni topilmadi")
          toast.error("Autentifikatsiya tokeni topilmadi")
          return
        }

        await axios.post(
          `https://oshxonacopy.pythonanywhere.com/api/orders/${orderId}/mark_delivered/`,
          {},
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        )

        setOrders(
          orders.map((order) =>
            order.id === orderId ? { ...order, status: "delivered", isPaid: true } : order
          )
        )
        toast.success(`Buyurtma #${orderId} yetkazildi!`)
      } catch (err) {
        console.error("Yetkazib berishni yakunlashda xato:", err)
        const errorMessage = err.response?.data?.message || err.message
        setError("Yetkazib berishni yakunlashda xato yuz berdi: " + errorMessage)
        toast.error("Yetkazib berishni yakunlashda xato yuz berdi")
      }
    }
  }

  const handleFinalizeDelivery = async () => {
    if (!selectedOrder) {
      toast.warn("Buyurtma tanlanmagan")
      return
    }

    if (!cashReceived || Number.parseInt(cashReceived) < selectedOrder.total) {
      toast.error("Qabul qilingan summa yetarli emas")
      return
    }

    try {
      const token = localStorage.getItem("token")
      if (!token) {
        setError("Autentifikatsiya tokeni topilmadi")
        toast.error("Autentifikatsiya tokeni topilmadi")
        return
      }

      await axios.post(
        `https://oshxonacopy.pythonanywhere.com/api/orders/${selectedOrder.id}/mark_delivered/`,
        {
          delivery_note: deliveryNote || undefined,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      )

      setOrders(
        orders.map((order) =>
          order.id === selectedOrder.id ? { ...order, status: "delivered", isPaid: true } : order
        )
      )
      setShowDeliveryCompleteDialog(false)
      setSelectedOrder(null)
      setDeliveryNote("")
      setCashReceived("")
      toast.success(`Buyurtma #${selectedOrder.id} muvaffaqiyatli yetkazildi!`)
    } catch (err) {
      console.error("Yetkazib berishni yakunlashda xato:", err)
      const errorMessage = err.response?.data?.message || err.message
      setError("Yetkazib berishni yakunlashda xato yuz berdi: " + errorMessage)
      toast.error("Yetkazib berishni yakunlashda xato yuz berdi")
    }
  }

  const handleViewOrderDetails = async (order) => {
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        setError("Autentifikatsiya tokeni topilmadi")
        toast.error("Autentifikatsiya tokeni topilmadi")
        return
      }

      const response = await axios.get(`https://oshxonacopy.pythonanywhere.com/api/orders/${order.id}/`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      console.log("API javobi (batafsil):", response.data)

      setSelectedOrder({
        ...order,
        customer: {
          name: response.data.customer_name || "Noma'lum",
          phone: response.data.customer_phone || "Noma'lum",
          address: response.data.customer_address || "Noma'lum",
        },
        items: response.data.items
          ? response.data.items.map((item) => ({
              id: item.id,
              name: item.product_details?.name || "Noma'lum mahsulot",
              quantity: item.quantity,
              price: parseFloat(item.unit_price) || 0,
              image_url: item.product_details?.image_url || "",
            }))
          : [],
        total: parseFloat(response.data.final_price) || 0,
        timestamp: new Date(response.data.created_at),
        status:
          response.data.status_display === "Yetkazildi"
            ? "delivered"
            : response.data.status_display === "Tayyor"
            ? "ready"
            : response.data.status_display === "Yetkazilmoqda"
            ? "delivering"
            : "delivered",
        paymentMethod: response.data.payment?.method || "cash",
        isPaid: !!response.data.payment,
        item_count: response.data.item_count || 0,
      })

      setShowOrderDetailsDialog(true)
      toast.info(`Buyurtma #${order.id} tafsilotlari yuklandi`)
    } catch (err) {
      console.error("Batafsil ma'lumot olishda xato:", err)
      const errorMessage = err.response?.data?.message || err.message
      setError("Batafsil ma'lumot olishda xato yuz berdi: " + errorMessage)
      toast.error("Batafsil ma'lumot olishda xato yuz berdi")
    }
  }

  const formatTime = (date) => {
    return date.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })
  }

  const getTimeDifference = (date) => {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000 / 60)
    return `${diff} daqiqa`
  }

  const calculateChange = () => {
    if (!cashReceived || !selectedOrder) return 0
    const change = Number.parseInt(cashReceived) - selectedOrder.total
    return change > 0 ? change : 0
  }

  const getPaymentMethodText = (method) => {
    switch (method) {
      case "cash":
        return "Naqd pul"
      case "card":
        return "Karta"
      case "mobile":
        return "Mobil to'lov"
      default:
        return method
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    router.push("/auth")
    toast.info("Tizimdan chiqildi")
  }

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Yuklanmoqda...</div>
  }

  return (
    <div className="flex h-screen flex-col">
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
        theme="light"
      />

      <header className="flex h-16 items-center justify-between border-b bg-background px-4">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/auth")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Yetkazib berish</h1>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Avatar>
              <AvatarImage src="/placeholder.svg?height=32&width=32" />
              <AvatarFallback>SM</AvatarFallback>
            </Avatar>
            <div className="hidden md:block">
              <p className="text-sm font-medium">Sardor Mahmudov</p>
              <p className="text-xs text-muted-foreground">Yetkazib beruvchi</p>
            </div>
          </div>
          <Button variant="outline" size="icon">
            <Bell className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="flex-1 p-4">
        {error ? (
          <div className="flex flex-col items-center justify-center h-40 text-center text-destructive">
            <p className="mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Qayta yuklash</Button>
          </div>
        ) : (
          <Tabs defaultValue="ready" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-3 mb-4">
              <TabsTrigger value="ready">Tayyor</TabsTrigger>
              <TabsTrigger value="delivering">Yetkazilmoqda</TabsTrigger>
              <TabsTrigger value="delivered">Yetkazildi</TabsTrigger>
            </TabsList>

            <TabsContent value="ready" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredOrders.length === 0 ? (
                  <div className="col-span-full flex flex-col items-center justify-center h-40 text-center text-muted-foreground">
                    <Truck className="mb-2 h-12 w-12" />
                    <h3 className="text-lg font-medium">Tayyor buyurtmalar yo'q</h3>
                    <p className="text-sm">Hozirda yetkazish uchun tayyor buyurtmalar mavjud emas</p>
                  </div>
                ) : (
                  filteredOrders.map((order) => (
                    <Card key={order.id} className="overflow-hidden">
                      <CardHeader className="bg-muted/50 pb-2">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-lg">Buyurtma #{order.id}</CardTitle>
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {getTimeDifference(order.timestamp)}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {order.customer.name}
                          </div>
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {order.customer.phone}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm">Mahsulotlar:</span>
                            <span className="text-sm font-medium">
                              {order.items ? order.items.length : order.item_count || 0} ta
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Jami summa:</span>
                            <span className="text-sm font-medium">{order.total.toLocaleString()} so'm</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">To'lov usuli:</span>
                            <span className="text-sm font-medium">{getPaymentMethodText(order.paymentMethod)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">To'lov holati:</span>
                            <Badge
                              variant={order.isPaid ? "success" : "outline"}
                              className={order.isPaid ? "bg-green-100 text-green-800" : ""}
                            >
                              {order.isPaid ? "To'langan" : "To'lanmagan"}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="flex flex-col gap-2 border-t p-2">
                        <Button variant="outline" className="w-full" onClick={() => handleViewOrderDetails(order)}>
                          Batafsil
                        </Button>
                        <Button variant="default" className="w-full" onClick={() => handleStartDelivery(order.id)}>
                          Yetkazishni boshlash
                        </Button>
                      </CardFooter>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="delivering" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredOrders.length === 0 ? (
                  <div className="col-span-full flex flex-col items-center justify-center h-40 text-center text-muted-foreground">
                    <Truck className="mb-2 h-12 w-12" />
                    <h3 className="text-lg font-medium">Yetkazilayotgan buyurtmalar yo'q</h3>
                    <p className="text-sm">Hozirda yetkazilayotgan buyurtmalar mavjud emas</p>
                  </div>
                ) : (
                  filteredOrders.map((order) => (
                    <Card key={order.id} className="overflow-hidden">
                      <CardHeader className="bg-muted/50 pb-2">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-lg">Buyurtma #{order.id}</CardTitle>
                          <Badge variant="outline" className="flex items-center gap-1 bg-yellow-100 text-yellow-800">
                            <Truck className="h-3 w-3" />
                            Yetkazilmoqda
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {order.customer.name}
                          </div>
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {order.customer.phone}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-start gap-1">
                            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{order.customer.address}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Mahsulotlar:</span>
                            <span className="text-sm font-medium">
                              {order.items ? order.items.length : order.item_count || 0} ta
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Jami summa:</span>
                            <span className="text-sm font-medium">{order.total.toLocaleString()} so'm</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">To'lov usuli:</span>
                            <span className="text-sm font-medium">{getPaymentMethodText(order.paymentMethod)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">To'lov holati:</span>
                            <Badge
                              variant={order.isPaid ? "success" : "outline"}
                              className={order.isPaid ? "bg-green-100 text-green-800" : ""}
                            >
                              {order.isPaid ? "To'langan" : "To'lanmagan"}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="flex flex-col gap-2 border-t p-2">
                        <Button variant="outline" className="w-full" onClick={() => handleViewOrderDetails(order)}>
                          Batafsil
                        </Button>
                        <Button variant="default" className="w-full" onClick={() => handleCompleteDelivery(order.id)}>
                          Yetkazildi
                        </Button>
                      </CardFooter>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="delivered" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredOrders.length === 0 ? (
                  <div className="col-span-full flex flex-col items-center justify-center h-40 text-center text-muted-foreground">
                    <Truck className="mb-2 h-12 w-12" />
                    <h3 className="text-lg font-medium">Yetkazilgan buyurtmalar yo'q</h3>
                    <p className="text-sm">Hozirda yetkazilgan buyurtmalar mavjud emas</p>
                  </div>
                ) : (
                  filteredOrders.map((order) => (
                    <Card key={order.id} className="overflow-hidden">
                      <CardHeader className="bg-muted/50 pb-2">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-lg">Buyurtma #{order.id}</CardTitle>
                          <Badge variant="success" className="flex items-center gap-1 bg-green-100 text-green-800">
                            <Check className="h-3 w-3" />
                            Yetkazildi
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {order.customer.name}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(order.timestamp)}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-start gap-1">
                            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{order.customer.address}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Mahsulotlar:</span>
                            <span className="text-sm font-medium">
                              {order.items ? order.items.length : order.item_count || 0} ta
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Jami summa:</span>
                            <span className="text-sm font-medium">{order.total.toLocaleString()} so'm</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">To'lov usuli:</span>
                            <span className="text-sm font-medium">{getPaymentMethodText(order.paymentMethod)}</span>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-between border-t p-2">
                        <Button variant="outline" className="w-full" onClick={() => handleViewOrderDetails(order)}>
                          Batafsil
                        </Button>
                      </CardFooter>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {selectedOrder && (
        <Dialog open={showOrderDetailsDialog} onOpenChange={setShowOrderDetailsDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Buyurtma #{selectedOrder.id} tafsilotlari</DialogTitle>
              <DialogDescription>{formatTime(selectedOrder.timestamp)} da qabul qilingan</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium">Mijoz ma'lumotlari</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedOrder.customer.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedOrder.customer.phone}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span>{selectedOrder.customer.address}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium">Buyurtma tarkibi</h3>
                <div className="space-y-2">
                  {selectedOrder.items && selectedOrder.items.length > 0 ? (
                    selectedOrder.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-10 h-10 object-cover rounded-md"
                              onError={(e) => (e.target.src = "/placeholder.svg?height=40&width=40")}
                            />
                          ) : (
                            <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center text-xs text-muted-foreground">
                              No Image
                            </div>
                          )}
                          <div>
                            <div>{item.name}</div>
                            <div className="text-sm text-muted-foreground">x{item.quantity}</div>
                          </div>
                        </div>
                        <div className="text-sm font-medium">
                          {(item.price * item.quantity).toLocaleString()} so'm
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">Mahsulotlar mavjud emas</div>
                  )}
                  <div className="border-t pt-2 mt-2 flex justify-between font-medium">
                    <div>Jami:</div>
                    <div>{selectedOrder.total.toLocaleString()} so'm</div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium">To'lov ma'lumotlari</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>To'lov usuli:</span>
                    <span>{getPaymentMethodText(selectedOrder.paymentMethod)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>To'lov holati:</span>
                    <Badge
                      variant={selectedOrder.isPaid ? "success" : "outline"}
                      className={selectedOrder.isPaid ? "bg-green-100 text-green-800" : ""}
                    >
                      {selectedOrder.isPaid ? "To'langan" : "To'lanmagan"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setShowOrderDetailsDialog(false)}>Yopish</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {selectedOrder && (
        <Dialog open={showDeliveryCompleteDialog} onOpenChange={setShowDeliveryCompleteDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Yetkazib berishni yakunlash</DialogTitle>
              <DialogDescription>
                Buyurtma #{selectedOrder.id} yetkazib berildi. To'lovni qabul qiling.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="total">Jami summa</Label>
                <Input id="total" value={`${selectedOrder.total.toLocaleString()} so'm`} readOnly />
              </div>
              <div className="space-y-2">
                <Label htmlFor="received">Qabul qilingan summa</Label>
                <Input
                  id="received"
                  type="number"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                />
              </div>
              {cashReceived && (
                <div className="space-y-2">
                  <Label htmlFor="change">Qaytim</Label>
                  <Input id="change" value={`${calculateChange().toLocaleString()} so'm`} readOnly />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="note">Izoh (ixtiyoriy)</Label>
                <Textarea
                  id="note"
                  placeholder="Yetkazib berish haqida izoh qoldiring..."
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeliveryCompleteDialog(false)}>
                Bekor qilish
              </Button>
              <Button
                onClick={handleFinalizeDelivery}
                disabled={!cashReceived || Number.parseInt(cashReceived) < selectedOrder.total}
              >
                Yakunlash
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}