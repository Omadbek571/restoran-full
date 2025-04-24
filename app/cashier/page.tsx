"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, CreditCard, DollarSign, LogOut, Printer, Receipt, ShoppingCart, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
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
      .get("https://oshxonacopy.pythonanywhere.com/api/cashier/orders-ready/", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })
      .then((res) => {
        console.log("Tayyor buyurtmalar API javobi:", res.data)
        setOrders(res.data || [])
        if (res.data.length === 0) {
          toast.warn("Hozirda tayyor buyurtmalar mavjud emas")
        }
      })
      .catch((err) => {
        console.error("Tayyor buyurtmalarni yuklashda xato:", err)
        setErrorOrders("Tayyor buyurtmalarni yuklashda xato yuz berdi")
        toast.error("Tayyor buyurtmalarni yuklashda xato yuz berdi")
      })

    axios
      .get("https://oshxonacopy.pythonanywhere.com/api/cashier/payment-history/", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })
      .then((res) => {
        console.log("To'langan buyurtmalar tarixi API javobi:", res.data)
        setPaymentHistory(res.data || [])
        if (res.data.length === 0) {
          toast.warn("To'langan buyurtmalar tarixi mavjud emas")
        }
      })
      .catch((err) => {
        console.error("To'langan buyurtmalar tarixini yuklashda xato:", err)
        setErrorHistory("To'langan buyurtmalar tarixini yuklashda xato yuz berdi")
        toast.error("To'langan buyurtmalar tarixini yuklashda xato yuz berdi")
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [router])

  const formatTime = (date) => {
    const parsedDate = new Date(date)
    return parsedDate.toLocaleTimeString("uz-UZ", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleSelectOrder = (order) => {
    setSelectedOrder(order)
    toast.info(`Buyurtma #${order.id} tanlandi`)
  }

  const handlePayment = () => {
    if (selectedOrder) {
      setShowPaymentDialog(true)
    } else {
      toast.warn("Iltimos, avval buyurtmani tanlang")
    }
  }

  const handleCompletePayment = async () => {
    if (!selectedOrder) {
      toast.warn("Buyurtma tanlanmagan")
      return
    }

    setPaymentError("")
    const token = localStorage.getItem("token")
    if (!token) {
      setPaymentError("Tizimga kirish sessiyasi tugagan. Iltimos, qayta kiring.")
      router.push("/auth")
      toast.error("Tizimga kirish sessiyasi tugagan")
      return
    }

    if (!paymentMethod) {
      setPaymentError("Iltimos, to'lov usulini tanlang.")
      toast.error("To'lov usuli tanlanmagan")
      return
    }

    const allowedMethods = ["cash", "card", "mobile"]
    if (!allowedMethods.includes(paymentMethod)) {
      setPaymentError("Noto'g'ri to'lov usuli tanlandi.")
      toast.error("Noto'g'ri to'lov usuli")
      return
    }

    if (paymentMethod === "mobile" && !selectedMobileProvider) {
      setPaymentError("Iltimos, mobil to'lov provayderini tanlang (Payme, Click yoki Apelsin).")
      toast.error("Mobil to'lov provayderi tanlanmagan")
      return
    }

    if (paymentMethod === "cash" && (!cashReceived || Number(cashReceived) <= 0)) {
      setPaymentError("Iltimos, qabul qilingan summani to'g'ri kiriting.")
      toast.error("Qabul qilingan summa noto'g'ri")
      return
    }

    const paymentData = {
      method: paymentMethod,
      received_amount: paymentMethod === "cash" ? cashReceived : undefined,
      mobile_provider: paymentMethod === "mobile" ? selectedMobileProvider : undefined,
    }

    try {
      const response = await axios.post(
        `https://oshxonacopy.pythonanywhere.com/api/orders/${selectedOrder.id}/process_payment/`,
        paymentData,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      )

      console.log("To'lov muvaffaqiyatli amalga oshirildi:", response.data)

      setOrders((prevOrders) =>
        prevOrders.filter((order) => order.id !== selectedOrder.id)
      )

      setShowPaymentDialog(false)
      setShowReceiptDialog(true)
      toast.success(`Buyurtma #${selectedOrder.id} uchun to'lov muvaffaqiyatli yakunlandi!`)
    } catch (err) {
      console.error("To'lovni amalga oshirishda xato:", err)
      const errorMessage =
        err.response?.data?.detail ||
        err.response?.data?.method?.[0] ||
        "To'lovni amalga oshirishda xato yuz berdi. Iltimos, qayta urinib ko'ring."
      setPaymentError(errorMessage)
      toast.error(errorMessage)
    }
  }

  const handlePrintReceipt = () => {
    toast.info("Chek chop etilmoqda...")
    setShowReceiptDialog(false)

    if (selectedOrder && selectedOrder.order_type === "dine_in") {
      toast.info(`Stol ${selectedOrder.table?.name || "Noma'lum"} bo'shatildi!`)
    }

    setSelectedOrder(null)
  }

  const calculateChange = () => {
    if (!cashReceived || !selectedOrder) return 0
    const change = Number.parseInt(cashReceived) - parseFloat(selectedOrder.final_price || 0)
    return change > 0 ? change : 0
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
          <Button variant="ghost" size="icon" onClick={() => router.push("/pos")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Kassa</h1>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              localStorage.removeItem("token")
              router.push("/auth")
              toast.info("Tizimdan chiqildi")
            }}
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/3 border-r">
          <Tabs defaultValue="ready-orders" className="h-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="ready-orders">Tayyor buyurtmalar</TabsTrigger>
              <TabsTrigger value="payment-history">To'langan buyurtmalar tarixi</TabsTrigger>
            </TabsList>

            <TabsContent value="ready-orders">
              {errorOrders ? (
                <div className="flex flex-col items-center justify-center h-40 text-center text-destructive">
                  <p className="mb-4">{errorOrders}</p>
                  <Button onClick={() => window.location.reload()}>Qayta yuklash</Button>
                </div>
              ) : (
                <ScrollArea className="h-[calc(100vh-8rem)]">
                  <div className="p-4 space-y-4">
                    {orders.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-40 text-center text-muted-foreground">
                        <ShoppingCart className="mb-2 h-12 w-12" />
                        <h3 className="text-lg font-medium">Tayyor buyurtmalar yo'q</h3>
                      </div>
                    ) : (
                      orders.map((order) => (
                        <Card
                          key={order.id}
                          className={`cursor-pointer hover:border-primary transition-colors ${
                            selectedOrder?.id === order.id ? "border-primary" : ""
                          }`}
                          onClick={() => handleSelectOrder(order)}
                        >
                          <CardHeader className="p-4 pb-2">
                            <div className="flex justify-between items-center">
                              <CardTitle className="text-base">
                                {order.order_type_display || "Noma'lum"}
                                {order.order_type === "dine_in" && ` - Stol ${order.table?.name || "Noma'lum"}`}
                              </CardTitle>
                              <Badge variant="outline">#{order.id}</Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {order.order_type !== "dine_in" && order.customer_name && (
                                <div>{order.customer_name}</div>
                              )}
                              <div>{formatTime(order.created_at)}</div>
                            </div>
                          </CardHeader>
                          <CardFooter className="p-4 pt-2 flex justify-between">
                            <div className="text-sm">
                              {order.items && Array.isArray(order.items) ? `${order.items.length} ta mahsulot` : "0 ta mahsulot"}
                            </div>
                            <div className="font-medium">{parseFloat(order.final_price || 0).toLocaleString()} so'm</div>
                          </CardFooter>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            <TabsContent value="payment-history">
              {errorHistory ? (
                <div className="flex flex-col items-center justify-center h-40 text-center text-destructive">
                  <p className="mb-4">{errorHistory}</p>
                  <Button onClick={() => window.location.reload()}>Qayta yuklash</Button>
                </div>
              ) : (
                <ScrollArea className="h-[calc(100vh-8rem)]">
                  <div className="p-4 space-y-4">
                    {paymentHistory.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-40 text-center text-muted-foreground">
                        <ShoppingCart className="mb-2 h-12 w-12" />
                        <h3 className="text-lg font-medium">To'langan buyurtmalar tarixi yo'q</h3>
                      </div>
                    ) : (
                      paymentHistory.map((order) => (
                        <Card
                          key={order.id}
                          className={`cursor-pointer hover:border-primary transition-colors ${
                            selectedOrder?.id === order.id ? "border-primary" : ""
                          }`}
                          onClick={() => handleSelectOrder(order)}
                        >
                          <CardHeader className="p-4 pb-2">
                            <div className="flex justify-between items-center">
                              <CardTitle className="text-base">
                                {order.order_type_display || "Noma'lum"}
                                {order.order_type === "dine_in" && ` - Stol ${order.table?.name || "Noma'lum"}`}
                              </CardTitle>
                              <Badge variant="outline">#{order.id}</Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {order.order_type !== "dine_in" && order.customer_name && (
                                <div>{order.customer_name}</div>
                              )}
                              <div>
                                To'lov vaqti: {formatTime(order.payment?.timestamp || order.updated_at)}
                              </div>
                              <div>
                                To'lov usuli: {order.payment?.method || "Noma'lum"}
                              </div>
                            </div>
                          </CardHeader>
                          <CardFooter className="p-4 pt-2 flex justify-between">
                            <div className="text-sm">
                              {order.items && Array.isArray(order.items) ? `${order.items.length} ta mahsulot` : "0 ta mahsulot"}
                            </div>
                            <div className="font-medium">{parseFloat(order.final_price || 0).toLocaleString()} so'm</div>
                          </CardFooter>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex-1 flex flex-col">
          {selectedOrder ? (
            <>
              <div className="p-4 border-b">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-medium">
                    {selectedOrder.order_type_display || "Noma'lum"}
                    {selectedOrder.order_type === "dine_in" && ` - Stol ${selectedOrder.table?.name || "Noma'lum"}`}
                  </h2>
                  <Badge variant="outline">Buyurtma #{selectedOrder.id}</Badge>
                </div>
                {selectedOrder.order_type !== "dine_in" && selectedOrder.customer_name && (
                  <div className="text-sm text-muted-foreground mt-1">
                    Mijoz: {selectedOrder.customer_name} - {selectedOrder.customer_phone || "Noma'lum"}
                  </div>
                )}
              </div>

              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Buyurtma tafsilotlari</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {selectedOrder.items && Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 ? (
                          selectedOrder.items.map((item) => (
                            <div key={item.id} className="flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                {item.product_details?.image_url ? (
                                  <img
                                    src={item.product_details.image_url}
                                    alt={item.product_details?.name || "Mahsulot"}
                                    className="w-10 h-10 object-cover rounded"
                                  />
                                ) : (
                                  <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-gray-500">
                                    Rasmsiz
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <div className="font-medium">{item.product_details?.name || "Noma'lum mahsulot"}</div>
                                  <Badge variant="secondary">x{item.quantity || 0}</Badge>
                                </div>
                              </div>
                              <div className="text-right">
                                <div>{parseFloat(item.total_price || 0).toLocaleString()} so'm</div>
                                <div className="text-xs text-muted-foreground">
                                  {parseFloat(item.unit_price || 0).toLocaleString()} so'm x {item.quantity || 0}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center text-muted-foreground">Buyurtma elementlari mavjud emas</div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>

              <div className="border-t p-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Jami (xizmat haqi bilan):</span>
                    <span>{parseFloat(selectedOrder.final_price || 0).toLocaleString()} so'm</span>
                  </div>
                </div>
                <Separator className="my-4" />
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handlePayment}
                  disabled={selectedOrder.payment}
                >
                  To'lov qilish
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
              <Receipt className="mb-4 h-16 w-16" />
              <h3 className="text-xl font-medium">Buyurtma tanlang</h3>
              <p className="max-w-md mt-2">
                To'lov qilish va chek chiqarish uchun chap tomondagi ro'yxatdan buyurtmani tanlang
              </p>
            </div>
          )}
        </div>
      </div>

      {selectedOrder && !selectedOrder.payment && (
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>To'lov</DialogTitle>
              <DialogDescription>To'lov usulini tanlang va to'lovni amalga oshiring</DialogDescription>
            </DialogHeader>
            {paymentError && (
              <div className="text-destructive text-center mb-4">{paymentError}</div>
            )}
            <div className="py-4">
              <Tabs defaultValue="cash" onValueChange={setPaymentMethod}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="cash" className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Naqd
                  </TabsTrigger>
                  <TabsTrigger value="card" className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Karta
                  </TabsTrigger>
                  <TabsTrigger value="mobile" className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    Mobil
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="cash" className="space-y-4 mt-4">
                  <div className="grid gap-2">
                    <Label htmlFor="total">Jami summa</Label>
                    <Input id="total" value={`${parseFloat(selectedOrder.final_price || 0).toLocaleString()} so'm`} readOnly />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="received">Qabul qilingan summa</Label>
                    <Input
                      id="received"
                      type="number"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                    />
                  </div>
                  {cashReceived && (
                    <div className="grid gap-2">
                      <Label htmlFor="change">Qaytim</Label>
                      <Input id="change" value={`${calculateChange().toLocaleString()} so'm`} readOnly />
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="card" className="space-y-4 mt-4">
                  <div className="grid gap-2">
                    <Label htmlFor="card-total">Jami summa</Label>
                    <Input id="card-total" value={`${parseFloat(selectedOrder.final_price || 0).toLocaleString()} so'm`} readOnly />
                  </div>
                  <div className="text-center text-muted-foreground">
                    <p>Terminal orqali to'lovni amalga oshiring</p>
                  </div>
                </TabsContent>

                <TabsContent value="mobile" className="space-y-4 mt-4">
                  <div className="grid gap-2">
                    <Label htmlFor="mobile-total">Jami summa</Label>
                    <Input
                      id="mobile-total"
                      value={`${parseFloat(selectedOrder.final_price || 0).toLocaleString()} so'm`}
                      readOnly
                    />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-muted-foreground">Quyidagi to'lov tizimlaridan birini tanlang</p>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        variant={selectedMobileProvider === "Payme" ? "default" : "outline"}
                        onClick={() => setSelectedMobileProvider("Payme")}
                      >
                        Payme
                      </Button>
                      <Button
                        variant={selectedMobileProvider === "Click" ? "default" : "outline"}
                        onClick={() => setSelectedMobileProvider("Click")}
                      >
                        Click
                      </Button>
                      <Button
                        variant={selectedMobileProvider === "Apelsin" ? "default" : "outline"}
                        onClick={() => setSelectedMobileProvider("Apelsin")}
                      >
                        Apelsin
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                Bekor qilish
              </Button>
              <Button onClick={handleCompletePayment}>To'lovni yakunlash</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {selectedOrder && (
        <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Chek</DialogTitle>
              <DialogDescription>To'lov muvaffaqiyatli amalga oshirildi</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <Card className="border-dashed">
                <CardHeader className="text-center pb-2">
                  <CardTitle>SmartResto</CardTitle>
                  <p className="text-sm text-muted-foreground">Toshkent sh., Chilonzor tumani</p>
                  <p className="text-sm text-muted-foreground">Tel: +998 71 123 45 67</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center text-sm">
                    <p>Chek: #{selectedOrder.id}</p>
                    <p>
                      {new Date().toLocaleDateString("uz-UZ")} {formatTime(new Date())}
                    </p>
                  </div>
                  <Separator />
                  <div className="space-y-2 text-sm">
                    {selectedOrder.items && Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 ? (
                      selectedOrder.items.map((item) => (
                        <div key={item.id} className="flex justify-between">
                          <div>
                            {item.product_details?.name || "Noma'lum mahsulot"} x{item.quantity || 0}
                          </div>
                          <div>{parseFloat(item.total_price || 0).toLocaleString()} so'm</div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center">Mahsulotlar mavjud emas</div>
                    )}
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <div>Jami (xizmat haqi bilan):</div>
                    <div>{parseFloat(selectedOrder.final_price || 0).toLocaleString()} so'm</div>
                  </div>
                  <div className="text-center text-xs text-muted-foreground pt-4">
                    <p>Xaridingiz uchun rahmat!</p>
                    <p>Yana tashrif buyuring!</p>
                  </div>
                </CardContent>
              </Card>
            </div>
            <DialogFooter>
              <Button className="w-full" onClick={handlePrintReceipt}>
                <Printer className="mr-2 h-4 w-4" />
                Chekni chop etish
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}