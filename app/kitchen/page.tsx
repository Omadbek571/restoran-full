"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Clock, LogOut, ChevronDown, ChevronUp } from "lucide-react"
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
  const [visibleCategories, setVisibleCategories] = useState({
    new: true,
    preparing: true,
    ready: true,
    completed: true,
  })

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
          toast.warn("Hozirda buyurtmalar mavjud emas")
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
        return servedOrders
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

      const updatedOrder = orders.find((order) => order.id === orderId)
      if (updatedOrder) {
        setOrders((prevOrders) => prevOrders.filter((order) => order.id !== orderId))
        setServedOrders((prevServed) => [
          ...prevServed,
          { ...updatedOrder, status: "completed", completed_at: new Date().toISOString() },
        ])
        toast.success(`Buyurtma #${orderId} bajarildi!`)
      }
    } catch (err) {
      console.error("Xatolik:", err)
      toast.error("Buyurtma holatini o'zgartirishda xatolik yuz berdi")
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
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    } catch (error) {
      console.error("Vaqtni formatlashda xatolik:", error)
      return "Vaqtni formatlashda xatolik"
    }
  }

  // Vaqt farqini hisoblash funksiyasi
  const getTimeDifference = (dateString) => {
    try {
      if (!dateString) return "Vaqt ko'rsatilmagan"
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return "Noto'g'ri vaqt formati"
      const now = new Date()
      const diff = Math.floor((now.getTime() - date.getTime()) / 1000 / 60)
      if (diff < 1) return "Hozirgina"
      if (diff < 60) return `${diff} daqiqa oldin`
      const hours = Math.floor(diff / 60)
      if (hours < 24) return `${hours} soat oldin`
      const days = Math.floor(hours / 24)
      return `${days} kun oldin`
    } catch (error) {
      console.error("Vaqt farqini hisoblashda xatolik:", error)
      return "Vaqtni hisoblashda xatolik"
    }
  }

  // Batafsil ko'rish funksiyasi
  const handleViewDetails = async (orderId) => {
    setDetailsLoading(true)
    setDetailsError("")
    setSelectedOrderDetails(null)

    try {
      const response = await axios.get(`https://oshxonacopy.pythonanywhere.com/api/orders/${orderId}/`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      setSelectedOrderDetails(response.data)
      setIsDetailsOpen(true)
      toast.info(`Buyurtma #${orderId} tafsilotlari yuklandi`)
    } catch (err) {
      console.error("Buyurtma tafsilotlarini yuklashda xato:", err)
      setDetailsError("Buyurtma tafsilotlarini yuklashda xato yuz berdi")
      toast.error("Buyurtma tafsilotlarini yuklashda xato yuz berdi")
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
  }

  // Checkbox holatini boshqarish
  const handleCategoryToggle = (category) => {
    setVisibleCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }))
  }

  // Buyurtma kartasi komponenti
  const OrderCard = ({ order, actionButton }) => {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/50 pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <span>#{order.id}</span>
                <Badge variant={order.order_type === "delivery" ? "destructive" : "outline"}>
                  {order.order_type_display}
                </Badge>
              </CardTitle>

              {(order.order_type === "delivery" || order.order_type === "takeaway") && (
                <div className="mt-2 space-y-1 text-sm">
                  {order.customer_name && <div className="font-medium">{order.customer_name}</div>}
                  {order.customer_phone && (
                    <div className="text-muted-foreground">Tel: {order.customer_phone}</div>
                  )}
                  {order.order_type === "delivery" && order.customer_address && (
                    <div className="text-muted-foreground">Manzil: {order.customer_address}</div>
                  )}
                </div>
              )}

              <div className="text-sm text-muted-foreground mt-1">
                <Clock className="h-4 w-4 inline mr-1" />
                {formatTime(order.created_at || order.completed_at)}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Stol: {order.table_name || "Mavjud emas"}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Umumiy narx: {order.final_price} so'm
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Elementlar soni: {order.item_count}
              </div>
            </div>
            <Badge variant="secondary">{getTimeDifference(order.created_at || order.completed_at)}</Badge>
          </div>
        </CardHeader>

        <CardFooter className="border-t p-2 flex justify-between">
          {actionButton}
          <Button
            variant="outline"
            onClick={() => handleViewDetails(order.id)}
            className="ml-2"
          >
            Batafsil ko'rish
          </Button>
        </CardFooter>
      </Card>
    )
  }

  if (isLoadingOrders) {
    return <div className="flex h-screen items-center justify-center">Yuklanmoqda...</div>
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Qayta yuklash</Button>
      </div>
    )
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

      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b bg-background px-4">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold">Oshxona</h1>
        </div>
        <div className="flex items-center space-x-4">
          <Select>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Kategoriyalarni tanlash" />
            </SelectTrigger>
            <SelectContent>
              <div className="p-2 space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="new"
                    checked={visibleCategories.new}
                    onCheckedChange={() => handleCategoryToggle("new")}
                  />
                  <label htmlFor="new" className="text-sm font-medium">
                    Yangi
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="preparing"
                    checked={visibleCategories.preparing}
                    onCheckedChange={() => handleCategoryToggle("preparing")}
                  />
                  <label htmlFor="preparing" className="text-sm font-medium">
                    Tayyorlanmoqda
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="ready"
                    checked={visibleCategories.ready}
                    onCheckedChange={() => handleCategoryToggle("ready")}
                  />
                  <label htmlFor="ready" className="text-sm font-medium">
                    Tayyor
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="completed"
                    checked={visibleCategories.completed}
                    onCheckedChange={() => handleCategoryToggle("completed")}
                  />
                  <label htmlFor="completed" className="text-sm font-medium">
                    Bajarilgan
                  </label>
                </div>
              </div>
            </SelectContent>
          </Select>
          <AlertDialog open={isLogoutOpen} onOpenChange={setIsLogoutOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="icon" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
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

      {/* Batafsil ko'rish modali */}
      <AlertDialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Buyurtma #{selectedOrderDetails?.id} tafsilotlari</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="max-h-[60vh] overflow-y-auto p-4">
            {detailsLoading ? (
              <div>Yuklanmoqda...</div>
            ) : detailsError ? (
              <div className="text-destructive">{detailsError}</div>
            ) : selectedOrderDetails ? (
              <div className="space-y-6">
                {/* Mijoz ma'lumotlari */}
                <div>
                  <h3 className="font-semibold text-lg">Mijoz ma'lumotlari</h3>
                  <div className="mt-2 space-y-1">
                    <p>Ism: {selectedOrderDetails.customer_name || "Mavjud emas"}</p>
                    <p>Telefon: {selectedOrderDetails.customer_phone || "Mavjud emas"}</p>
                    <p>Manzil: {selectedOrderDetails.customer_address || "Mavjud emas"}</p>
                  </div>
                </div>

                {/* Buyurtma ma'lumotlari */}
                <div>
                  <h3 className="font-semibold text-lg">Buyurtma ma'lumotlari</h3>
                  <div className="mt-2 space-y-1">
                    <p>ID: {selectedOrderDetails.id}</p>
                    <p>Turi: {selectedOrderDetails.order_type_display}</p>
                    <p>Holati: {selectedOrderDetails.status_display}</p>
                    <p>Stol: {selectedOrderDetails.table?.name || "Mavjud emas"}</p>
                    <p>Stol zonasi: {selectedOrderDetails.table?.zone || "Mavjud emas"}</p>
                    <p>Yaratilgan vaqt: {formatTime(selectedOrderDetails.created_at)}</p>
                    <p>Yangilangan vaqt: {formatTime(selectedOrderDetails.updated_at)}</p>
                  </div>
                </div>

                {/* Buyurtma elementlari */}
                <div>
                  <h3 className="font-semibold text-lg">Buyurtma elementlari</h3>
                  {selectedOrderDetails.items && selectedOrderDetails.items.length > 0 ? (
                    <ul className="mt-2 space-y-2">
                      {selectedOrderDetails.items.map((item) => (
                        <li key={item.id} className="border-b pb-2">
                          <p>Taom: {item.product_details.name}</p>
                          <p>Soni: {item.quantity}</p>
                          <p>Birlik narxi: {item.unit_price} so'm</p>
                          <p>Umumiy narx: {item.total_price} so'm</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2">Buyurtma elementlari mavjud emas</p>
                  )}
                </div>

                {/* Qo'shimcha xizmatlar va narx */}
                <div>
                  <h3 className="font-semibold text-lg">Narx va xizmatlar</h3>
                  <div className="mt-2 space-y-1">
                    <p>Xizmat haqi: {selectedOrderDetails.service_fee_percent}%</p>
                    <p>Soliq: {selectedOrderDetails.tax_percent}%</p>
                    <p>Umumiy narx: {selectedOrderDetails.final_price} so'm</p>
                  </div>
                </div>
              </div>
            ) : (
              <div>Ma'lumotlar mavjud emas</div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Yopish</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Main content */}
      <div className="flex-1 p-4 overflow-auto">
        {Object.values(visibleCategories).every((value) => !value) ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Hech qanday kategoriya tanlanmagan
          </div>
        ) : (
          <div
            className={`grid gap-6 ${
              Object.values(visibleCategories).filter(Boolean).length === 4
                ? "grid-cols-1 lg:grid-cols-4"
                : Object.values(visibleCategories).filter(Boolean).length === 3
                ? "grid-cols-1 lg:grid-cols-3"
                : Object.values(visibleCategories).filter(Boolean).length === 2
                ? "grid-cols-1 lg:grid-cols-2"
                : "grid-cols-1"
            }`}
          >
            {/* Yangi buyurtmalar */}
            {visibleCategories.new && (
              <div className="flex flex-col border border-gray-200 rounded-lg p-4">
                <Collapsible
                  open={openCollapsibles.new}
                  onOpenChange={() => toggleCollapsible("new")}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full">
                    <h2 className="text-2xl font-bold">Yangi</h2>
                    {openCollapsibles.new ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="flex-1 overflow-y-auto mt-4">
                      {filteredOrders("new").length === 0 ? (
                        <div className="flex items-center justify-center h-32 text-muted-foreground">
                          Yangi buyurtmalar yo'q
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {filteredOrders("new").map((order) => (
                            <OrderCard
                              key={order.id}
                              order={order}
                              actionButton={
                                <Button
                                  className="w-full bg-yellow-600 hover:bg-yellow-700"
                                  onClick={() => handleStartPreparing(order.id)}
                                >
                                  Tayyorlashni boshlash
                                </Button>
                              }
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {/* Tayyorlanmoqda buyurtmalar */}
            {visibleCategories.preparing && (
              <div className="flex flex-col border border-gray-200 rounded-lg p-4">
                <Collapsible
                  open={openCollapsibles.preparing}
                  onOpenChange={() => toggleCollapsible("preparing")}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full">
                    <h2 className="text-2xl font-bold">Tayyorlanmoqda</h2>
                    {openCollapsibles.preparing ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="flex-1 overflow-y-auto mt-4">
                      {filteredOrders("preparing").length === 0 ? (
                        <div className="flex items-center justify-center h-32 text-muted-foreground">
                          Tayyorlanayotgan buyurtmalar yo'q
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {filteredOrders("preparing").map((order) => (
                            <OrderCard
                              key={order.id}
                              order={order}
                              actionButton={
                                <Button
                                  className="w-full bg-yellow-600 hover:bg-yellow-700"
                                  onClick={() => handleOrderReady(order.id)}
                                >
                                  Tayyor
                                </Button>
                              }
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {/* Tayyor buyurtmalar */}
            {visibleCategories.ready && (
              <div className="flex flex-col border border-gray-200 rounded-lg p-4">
                <Collapsible
                  open={openCollapsibles.ready}
                  onOpenChange={() => toggleCollapsible("ready")}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full">
                    <h2 className="text-2xl font-bold">Tayyor</h2>
                    {openCollapsibles.ready ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="flex-1 overflow-y-auto mt-4">
                      {filteredOrders("ready").length === 0 ? (
                        <div className="flex items-center justify-center h-32 text-muted-foreground">
                          Tayyor buyurtmalar yo'q
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {filteredOrders("ready").map((order) => (
                            <OrderCard
                              key={order.id}
                              order={order}
                              actionButton={
                                <Button
                                  className="w-full bg-green-600 hover:bg-green-700"
                                  onClick={() => handleCompleteOrder(order.id)}
                                >
                                  Bajarilgan
                                </Button>
                              }
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {/* Bajarilgan buyurtmalar */}
            {visibleCategories.completed && (
              <div className="flex flex-col border border-gray-200 rounded-lg p-4">
                <Collapsible
                  open={openCollapsibles.completed}
                  onOpenChange={() => toggleCollapsible("completed")}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full">
                    <h2 className="text-2xl font-bold">Bajarilgan</h2>
                    {openCollapsibles.completed ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="flex-1 overflow-y-auto mt-4">
                      {filteredOrders("completed").length === 0 ? (
                        <div className="flex items-center justify-center h-32 text-muted-foreground">
                          Bajarilgan buyurtmalar yo'q
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {filteredOrders("completed").map((order) => (
                            <OrderCard key={order.id} order={order} />
                          ))}
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}