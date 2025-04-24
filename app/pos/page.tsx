"use client"

import { useState, useEffect, useMemo } from "react"
import { Bell, LogOut, Search, ShoppingBag, ShoppingCart, Truck, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import axios from "axios"
import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

// Joylar (API’dagi `zone` maydoniga moslashtirildi)
const places = [
  { id: 1, name: "Zal", value: "Hall" },
]

export default function POSPage() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)
  const [error, setError] = useState("")
  const [errorCategories, setErrorCategories] = useState("")
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [cart, setCart] = useState([])
  const [orderType, setOrderType] = useState("dine_in")
  const [selectedTable, setSelectedTable] = useState(null)
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [showTableDialog, setShowTableDialog] = useState(false)
  const [customerInfo, setCustomerInfo] = useState({ name: "", phone: "", address: "" })
  const [showCustomerDialog, setShowCustomerDialog] = useState(false)
  const [tables, setTables] = useState([])
  const [isLoadingTables, setIsLoadingTables] = useState(true)
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)

  // Kategoriyalarni yuklash
  useEffect(() => {
    setIsLoadingCategories(true)
    axios
      .get("https://oshxonacopy.pythonanywhere.com/api/categories/", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      .then((res) => {
        console.log("Kategoriyalar API javobi:", res.data)
        setCategories(res.data || [])
        setIsLoadingCategories(false)
      })
      .catch((err) => {
        console.error("Kategoriyalarni yuklashda xato:", err)
        setErrorCategories("Kategoriyalarni yuklashda xato yuz berdi")
        toast.error("Kategoriyalarni yuklashda xato yuz berdi")
        setIsLoadingCategories(false)
      })
  }, [])

  // Mahsulotlarni yuklash
  useEffect(() => {
    setIsLoading(true)
    axios
      .get("https://oshxonacopy.pythonanywhere.com/api/products/", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      .then((res) => {
        setProducts(res.data)
        setIsLoading(false)
      })
      .catch((err) => {
        console.error("Mahsulotlarni yuklashda xato:", err)
        setError("Mahsulotlarni yuklashda xato yuz berdi")
        toast.error("Mahsulotlarni yuklashda xato yuz berdi")
        setIsLoading(false)
      })
  }, [])

  // Stollarni yuklash
  const fetchTables = () => {
    setIsLoadingTables(true)
    axios
      .get("https://oshxonacopy.pythonanywhere.com/api/tables/", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      .then((res) => {
        setTables(res.data)
        setIsLoadingTables(false)
      })
      .catch((err) => {
        console.error("Stollar yuklashda xato:", err)
        toast.error("Stollarni yuklashda xato yuz berdi")
        setIsLoadingTables(false)
      })
  }

  useEffect(() => {
    fetchTables()
  }, [])

  // OrderType o‘zgarganda mijoz ma'lumotlarini so‘rash
  useEffect(() => {
    if (orderType === "takeaway" || orderType === "delivery") {
      setShowCustomerDialog(true)
    } else {
      setShowCustomerDialog(false)
      setCustomerInfo({ name: "", phone: "", address: "" })
    }
  }, [orderType])

  // Savatga mahsulot qo‘shish
  function addToCart(product) {
    const existingItem = cart.find((item) => item.id === product.id)
    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      )
    } else {
      setCart([...cart, { id: product.id, product, quantity: 1 }])
    }
  }

  // Buyurtma yuborish funksiyasi
  function submitOrder() {
    if (cart.length === 0) {
      toast.warn("Savat bo‘sh! Iltimos, mahsulot qo‘shing.")
      return
    }

    if (orderType === "dine_in" && !selectedTable) {
      toast.warn("Iltimos, stol tanlang!")
      setShowTableDialog(true)
      return
    }

    if (orderType === "takeaway" || orderType === "delivery") {
      if (!customerInfo.name || !customerInfo.phone || (orderType === "delivery" && !customerInfo.address)) {
        setShowCustomerDialog(true)
        toast.warn(
          orderType === "delivery"
            ? "Iltimos, mijoz nomi, telefon raqami va manzilini kiriting!"
            : "Iltimos, mijoz nomi va telefon raqamini kiriting!"
        )
        return
      }
    }

    const orderData = {
      order_type: orderType,
      table_id: orderType === "dine_in" ? selectedTable : null,
      customer_name: customerInfo.name || null,
      customer_phone: customerInfo.phone || null,
      customer_address: orderType === "delivery" ? customerInfo.address : null,
      items: cart.map((item) => ({
        product_id: item.id,
        quantity: item.quantity,
      })),
    }

    axios
      .post("https://oshxonacopy.pythonanywhere.com/api/orders/", orderData, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      .then((res) => {
        toast.success("Buyurtma muvaffaqiyatli yuborildi!")
        setCart([])
        setCustomerInfo({ name: "", phone: "", address: "" })
        setShowCustomerDialog(false)
        setShowTableDialog(false)
        fetchTables()
      })
      .catch((err) => {
        console.error("Buyurtma yuborishda xato:", err)
        toast.error("Buyurtma yuborishda xato yuz berdi. Iltimos, qayta urinib ko‘ring.")
      })
  }

  // Mijoz ma'lumotlarini saqlash
  function handleCustomerInfoSave() {
    if (!customerInfo.name || !customerInfo.phone || (orderType === "delivery" && !customerInfo.address)) {
      toast.warn(
        orderType === "delivery"
          ? "Iltimos, mijoz nomi, telefon raqami va manzilini kiriting!"
          : "Iltimos, mijoz nomi va telefon raqamini kiriting!"
      )
      return
    }
    setShowCustomerDialog(false)
    toast.success("Mijoz ma'lumotlari saqlandi!")
  }

  // Savatdan mahsulotni kamaytirish
  function decreaseQuantity(item) {
    if (item.quantity === 1) {
      setCart(cart.filter((cartItem) => cartItem.id !== item.id))
      toast.info(`${item.product.name} savatdan o‘chirildi`)
    } else {
      setCart(
        cart.map((cartItem) =>
          cartItem.id === item.id ? { ...cartItem, quantity: cartItem.quantity - 1 } : cartItem
        )
      )
    }
  }

  // Savatga mahsulot qo‘shish (miqdorini oshirish)
  function increaseQuantity(item) {
    setCart(
      cart.map((cartItem) =>
        cartItem.id === item.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem
      )
    )
  }

  // Filtrlangan mahsulotlar
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory = selectedCategory === null || product.category?.id === selectedCategory
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [products, selectedCategory, searchQuery])

  // Logout tasdiqlash
  function handleLogout() {
    localStorage.removeItem("token")
    window.location.href = "/auth"
    toast.info("Tizimdan chiqildi")
  }

  // UI qismi (return)
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
          <Button variant="ghost" size="icon" onClick={() => setShowLogoutDialog(true)}>
            <LogOut className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">SmartResto POS</h1>
        </div>
        <div className="flex items-center space-x-4">
          <Tabs
            defaultValue="dine_in"
            value={orderType}
            onValueChange={(value) => setOrderType(value)}
            className="w-[400px]"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="dine_in" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Shu yerda
              </TabsTrigger>
              <TabsTrigger value="takeaway" className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Olib ketish
              </TabsTrigger>
              <TabsTrigger value="delivery" className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Yetkazib berish
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="icon">
            <Bell className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - Categories and Products */}
        <div className="flex w-2/3 flex-col border-r">
          {/* Search and categories */}
          <div className="border-b p-4">
            <div className="relative mb-4">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Qidirish..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <ScrollArea className="whitespace-nowrap pb-2">
              <div className="flex space-x-2">
                <Button
                  variant={selectedCategory === null ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => setSelectedCategory(null)}
                >
                  Barchasi
                </Button>
                {isLoadingCategories ? (
                  <p>Kategoriyalar yuklanmoqda...</p>
                ) : errorCategories ? (
                  <p className="text-destructive">{errorCategories}</p>
                ) : (
                  categories.map((category) => (
                    <Button
                      key={category.id}
                      variant={selectedCategory === category.id ? "default" : "outline"}
                      className="rounded-full"
                      onClick={() => setSelectedCategory(category.id)}
                    >
                      {category.name}
                    </Button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Products grid */}
          <ScrollArea className="flex-1 p-4">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <p>Yuklanmoqda...</p>
              </div>
            ) : error ? (
              <div className="flex h-full flex-col items-center justify-center">
                <p className="text-destructive mb-4">{error}</p>
                <Button onClick={() => window.location.reload()}>Qayta yuklash</Button>
              </div>
            ) : (
              <div className="grid grid-cols-6 gap-3">
                {filteredProducts.length === 0 ? (
                  <div className="col-span-3 flex h-40 items-center justify-center text-muted-foreground">
                    <p>Mahsulotlar topilmadi</p>
                  </div>
                ) : (
                  filteredProducts.map((product) => (
                    <Card
                      key={product.id}
                      className="cursor-pointer overflow-hidden transition-all hover:shadow-md h-[250px]"
                      onClick={() => addToCart(product)}
                    >
                      <CardContent className="p-0 h-full flex flex-col">
                        <div className="h-[200px] relative">
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-[170px] object-cover"
                            style={{ display: "block" }}
                          />
                        </div>
                        <div className="p-4 flex-1">
                          <h3 className="font-medium text-lg">{product.name}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {Number(product.price).toLocaleString()} so‘m
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right sidebar - Cart */}
        <div className="flex w-1/3 flex-col">
          <div className="flex items-center justify-between border-b p-4">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="h-5 w-5" />
              <h2 className="text-lg font-medium">Buyurtma</h2>
            </div>
            {orderType === "dine_in" && selectedTable && (
              <Badge variant="outline" className="text-sm">
                {tables.find((t) => t.id === selectedTable)?.name
                  ? `Stol ${tables.find((t) => t.id === selectedTable).name}`
                  : `Stol ${selectedTable}`}
              </Badge>
            )}
            {orderType === "dine_in" && (
              <Button variant="outline" size="sm" onClick={() => setShowTableDialog(true)}>
                {selectedTable ? "Stolni o‘zgartirish" : "Stol tanlash"}
              </Button>
            )}
          </div>

          <ScrollArea className="flex-1 p-4">
            {cart.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                <ShoppingCart className="mb-2 h-12 w-12" />
                <h3 className="text-lg font-medium">Savat bo‘sh</h3>
                <p className="text-sm">Buyurtma berish uchun mahsulotlarni tanlang</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between space-x-2">
                    <div className="flex-1">
                      <h3 className="font-medium">{item.product.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {Number(item.product.price).toLocaleString()} so‘m
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 border rounded-md flex items-center justify-center"
                        onClick={() => decreaseQuantity(item)}
                      >
                        -
                      </button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 border rounded-md flex items-center justify-center"
                        onClick={() => increaseQuantity(item)}
                      >
                        +
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {(item.product.price * item.quantity).toLocaleString()} so‘m
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="border-t p-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Jami:</span>
                <span className="font-medium">
                  {cart
                    .reduce((total, item) => total + item.product.price * item.quantity, 0)
                    .toLocaleString()}{" "}
                  so‘m
                </span>
              </div>
            </div>
            <Separator className="my-4" />
            <Button
              className="w-full"
              size="lg"
              disabled={cart.length === 0}
              onClick={submitOrder}
            >
              Buyurtmani yuborish
            </Button>
          </div>
        </div>
      </div>

      {/* Table selection dialog */}
      <Dialog open={showTableDialog} onOpenChange={setShowTableDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Stol tanlash</DialogTitle>
            <DialogDescription>Buyurtma uchun stol raqamini tanlang</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="mb-4 flex space-x-2">
              <Select value={selectedPlace || ""} onValueChange={(value) => setSelectedPlace(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Joyni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {places.map((place) => (
                    <SelectItem key={place.id} value={place.value}>
                      {place.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isLoadingTables ? (
              <div className="flex justify-center items-center h-40">
                <p>Stollar yuklanmoqda...</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-4 mt-4">
                {tables
                  .filter((table) => !selectedPlace || table.zone === selectedPlace)
                  .map((table) => (
                    <Button
                      key={table.id}
                      variant={selectedTable === table.id ? "default" : "outline"}
                      className={`h-20 flex flex-col justify-center items-center rounded-lg shadow-sm transition-all ${
                        !table.is_available
                          ? "bg-red-100 text-muted-foreground cursor-not-allowed"
                          : "bg-green-100 hover:bg-green-200"
                      } ${selectedTable === table.id ? "bg-blue-500 text-white" : ""}`}
                      disabled={!table.is_available}
                      onClick={() => {
                        setSelectedTable(table.id)
                        setShowTableDialog(false)
                        toast.success(`Stol ${table.name} tanlandi`)
                      }}
                    >
                      <div className="text-center">
                        <div className="font-semibold text-lg">Stol {table.name}</div>
                        <div className="text-xs mt-1">{table.is_available ? "Bo‘sh" : "Band"}</div>
                      </div>
                    </Button>
                  ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTableDialog(false)}>
              Bekor qilish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer info dialog */}
      <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {orderType === "delivery" ? "Yetkazib berish ma‘lumotlari" : "Mijoz ma‘lumotlari"}
            </DialogTitle>
            <DialogDescription>
              {orderType === "delivery"
                ? "Yetkazib berish uchun mijoz ma‘lumotlarini kiriting"
                : "Olib ketish uchun mijoz ma‘lumotlarini kiriting"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Ism
              </Label>
              <Input
                id="name"
                value={customerInfo.name}
                onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">
                Telefon
              </Label>
              <Input
                id="phone"
                value={customerInfo.phone}
                onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                className="col-span-3"
                required
              />
            </div>
            {orderType === "delivery" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="address" className="text-right">
                  Manzil
                </Label>
                <Input
                  id="address"
                  value={customerInfo.address}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomerDialog(false)}>
              Bekor qilish
            </Button>
            <Button
              onClick={handleCustomerInfoSave}
              disabled={
                !customerInfo.name || !customerInfo.phone || (orderType === "delivery" && !customerInfo.address)
              }
            >
              Saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Chiqish dialog modali */}
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Chiqishni tasdiqlash</DialogTitle>
            <DialogDescription>Rostdan ham chiqishni xohlaysizmi?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex justify-between">
            <Button variant="outline" onClick={() => setShowLogoutDialog(false)}>
              Bekor qilish
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              Chiqish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}