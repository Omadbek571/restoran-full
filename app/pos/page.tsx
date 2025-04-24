"use client"

import { useState, useEffect, useMemo } from "react"
import { Bell, LogOut, Search, ShoppingBag, ShoppingCart, Truck, Users, Minus, Plus as PlusIcon } from "lucide-react" // Minus va Plus ikonkalari import qilindi
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
import { ScrollBar } from "@/components/ui/scroll-area"

// Joylar (API’dagi `zone` maydoniga moslashtirildi)
const places = [
  { id: 1, name: "Zal", value: "Hall" },
  // Boshqa joylar kerak bo'lsa qo'shiladi
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
  const [selectedPlace, setSelectedPlace] = useState(null) // Tanlangan joy uchun state
  const [showTableDialog, setShowTableDialog] = useState(false)
  const [customerInfo, setCustomerInfo] = useState({ name: "", phone: "", address: "" })
  const [showCustomerDialog, setShowCustomerDialog] = useState(false)
  const [tables, setTables] = useState([])
  const [isLoadingTables, setIsLoadingTables] = useState(true)
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)

  // Helper function to get token
  const getToken = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("token")
    }
    return null
  }

  // Kategoriyalarni yuklash
  useEffect(() => {
    const token = getToken()
    if (!token) {
      toast.error("Avtorizatsiya tokeni topilmadi!")
      setErrorCategories("Token yo'q")
      setIsLoadingCategories(false)
      // Optionally redirect to login
      // window.location.href = "/auth";
      return
    }
    setIsLoadingCategories(true)
    axios
      .get("https://oshxonacopy.pythonanywhere.com/api/categories/", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
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
    const token = getToken()
    if (!token) {
      toast.error("Avtorizatsiya tokeni topilmadi!")
      setError("Token yo'q")
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    axios
      .get("https://oshxonacopy.pythonanywhere.com/api/products/", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })
      .then((res) => {
        setProducts(res.data || []) // Ensure it's an array
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
    const token = getToken()
    if (!token) {
      toast.error("Avtorizatsiya tokeni topilmadi!")
      setIsLoadingTables(false)
      return
    }
    setIsLoadingTables(true)
    axios
      .get("https://oshxonacopy.pythonanywhere.com/api/tables/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((res) => {
        setTables(res.data || []) // Ensure it's an array
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
      // Agar cart bo'sh bo'lsa yoki mijoz ma'lumotlari allaqachon kiritilgan bo'lsa, dialog ochilmasin
      // if (cart.length > 0 && (!customerInfo.name || !customerInfo.phone)) {
         setShowCustomerDialog(true)
      // }
    } else {
      setShowCustomerDialog(false)
      // dine_in tanlanganda mijoz ma'lumotlarini tozalash shart emas, chunki u ishlatilmaydi
      // setCustomerInfo({ name: "", phone: "", address: "" })
    }
  }, [orderType]) // Removed cart and customerInfo dependency to open dialog when type changes

  // Savatga mahsulot qo‘shish
  function addToCart(product) {
     if (!product || !product.id) {
        console.error("Noto'g'ri mahsulot:", product)
        toast.error("Mahsulot qo'shishda xatolik.")
        return
     }
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
    toast.success(`${product.name} savatga qo'shildi!`)
  }

  // Buyurtma yuborish funksiyasi
  function submitOrder() {
    const token = getToken()
    if (!token) {
      toast.error("Avtorizatsiya tokeni topilmadi! Iltimos, qayta kiring.")
      return
    }

    if (cart.length === 0) {
      toast.warn("Savat bo‘sh! Iltimos, mahsulot qo‘shing.")
      return
    }

    if (orderType === "dine_in" && !selectedTable) {
      toast.warn("Iltimos, stol tanlang!")
      setShowTableDialog(true)
      return
    }

    // Mijoz ma'lumotlarini tekshirish (Olib ketish va Yetkazib berish uchun)
    if (orderType === "takeaway" || orderType === "delivery") {
      if (!customerInfo.name || !customerInfo.phone) {
        setShowCustomerDialog(true)
        toast.warn("Iltimos, mijoz nomi va telefon raqamini kiriting!")
        return
      }
      if (orderType === "delivery" && !customerInfo.address) {
        setShowCustomerDialog(true)
        toast.warn("Yetkazib berish uchun manzilni kiriting!")
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
      // zone: orderType === "dine_in" && selectedTable ? tables.find(t => t.id === selectedTable)?.zone : null // Zone ni qo'shish
    }

    console.log("Yuborilayotgan buyurtma:", orderData); // Yuborishdan oldin tekshirish

    // Submit promise
    toast.promise(
      axios.post("https://oshxonacopy.pythonanywhere.com/api/orders/", orderData, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }),
      {
        pending: 'Buyurtma yuborilmoqda...',
        success: 'Buyurtma muvaffaqiyatli yuborildi!',
        error: 'Buyurtma yuborishda xato yuz berdi!'
      }
    ).then((res) => {
        // Success actions
        setCart([])
        setCustomerInfo({ name: "", phone: "", address: "" })
        setSelectedTable(null) // Stol tanlovini tozalash
        setSelectedPlace(null) // Joy tanlovini tozalash
        setShowCustomerDialog(false)
        setShowTableDialog(false)
        fetchTables() // Stollarni yangilash
      })
      .catch((err) => {
        console.error("Buyurtma yuborishda xato:", err);
        // Qo'shimcha xato xabarlari
        if (err.response) {
          console.error("Server javobi:", err.response.data)
          let errorMsg = "Server xatosi."
          if (typeof err.response.data === 'string') {
            errorMsg = err.response.data;
          } else if (typeof err.response.data === 'object') {
            errorMsg = JSON.stringify(err.response.data);
          }
          toast.error(`Xatolik: ${errorMsg}`)
        }
        // toast.error da allaqachon xabar chiqariladi
      })
  }

  // Mijoz ma'lumotlarini saqlash
  function handleCustomerInfoSave() {
    // Bu funksiya asosan dialog'ni yopadi va submitOrder ichida tekshiriladi
     if (!customerInfo.name || !customerInfo.phone) {
        toast.warn("Iltimos, mijoz nomi va telefon raqamini kiriting!")
        return
      }
      if (orderType === "delivery" && !customerInfo.address) {
        toast.warn("Yetkazib berish uchun manzilni kiriting!")
        return
      }
    setShowCustomerDialog(false)
    toast.info("Mijoz ma'lumotlari vaqtincha saqlandi. Buyurtmani yuboring.") // Xabarni o'zgartirish
  }

  // Savatdan mahsulotni kamaytirish
  function decreaseQuantity(item) {
    if (!item || !item.id) return;
    if (item.quantity === 1) {
      setCart(cart.filter((cartItem) => cartItem.id !== item.id))
      toast.info(`${item.product?.name || 'Mahsulot'} savatdan o‘chirildi`)
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
    if (!item || !item.id) return;
    setCart(
      cart.map((cartItem) =>
        cartItem.id === item.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem
      )
    )
  }

  // Filtrlangan mahsulotlar
  const filteredProducts = useMemo(() => {
     // Ensure products is an array before filtering
    if (!Array.isArray(products)) {
       return [];
    }
    return products.filter((product) => {
       // Check if product and product.name exist
      const productName = product?.name ?? '';
      const matchesCategory = selectedCategory === null || product?.category?.id === selectedCategory
      const matchesSearch = productName.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesCategory && matchesSearch && product.is_active // Faqat aktiv mahsulotlarni ko'rsatish
    })
  }, [products, selectedCategory, searchQuery])

  // Logout tasdiqlash
  function handleLogout() {
    localStorage.removeItem("token")
    window.location.href = "/auth" // Redirect to login
    toast.info("Tizimdan chiqildi")
  }

  // Savatning umumiy summasi
  const cartTotal = useMemo(() => {
    return cart.reduce((total, item) => {
      const price = parseFloat(item.product?.price) || 0;
      return total + price * item.quantity;
    }, 0);
  }, [cart]);

  // UI qismi (return)
  return (
    <div className="flex h-screen flex-col bg-muted/40"> {/* Added background color */}
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
        theme="colored" // Changed theme for better visibility
      />

      {/* Header */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-4 sm:px-6 shrink-0">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="outline" size="icon" className="shrink-0" onClick={() => setShowLogoutDialog(true)}>
            <LogOut className="h-5 w-5" />
            <span className="sr-only">Chiqish</span>
          </Button>
          <h1 className="text-lg sm:text-xl font-bold hidden md:inline-block">SmartResto POS</h1>
        </div>

        {/* Header o'rtasi - Buyurtma turi */}
        <div className="flex-1 flex justify-center px-4">
           <Tabs
            defaultValue="dine_in"
            value={orderType}
            onValueChange={(value) => setOrderType(value)}
            className="w-full max-w-md" // Fixed width olib tashlandi, max-width qo'shildi
          >
            {/* TabsList kichik ekranlar uchun moslashtirildi */}
            <TabsList className="grid w-full grid-cols-3 h-11">
              <TabsTrigger value="dine_in" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-1">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Shu yerda</span>
                 <span className="sm:hidden">Ichkarida</span>
              </TabsTrigger>
              <TabsTrigger value="takeaway" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-1">
                <ShoppingBag className="h-4 w-4" />
                <span className="hidden sm:inline">Olib ketish</span>
                 <span className="sm:hidden">Olib k.</span>
              </TabsTrigger>
              <TabsTrigger value="delivery" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-1">
                <Truck className="h-4 w-4" />
                <span className="hidden sm:inline">Yetkazish</span>
                 <span className="sm:hidden">Yetkaz.</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* Vaqtinchalik o'chirilgan bildirishnomalar
           <Button variant="outline" size="icon" className="shrink-0">
            <Bell className="h-5 w-5" />
             <span className="sr-only">Bildirishnomalar</span>
           </Button>
          */}
          {/* Foydalanuvchi nomi yoki avatar qo'shilishi mumkin */}
        </div>
      </header>

      {/* Asosiy Kontent Grid bilan */}
       {/* Main content - Changed flex to grid for responsiveness */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-0 overflow-hidden">

        {/* Chap taraf - Kategoriyalar va Mahsulotlar */}
         {/* Products Section - Spans multiple columns on larger screens */}
        <div className="md:col-span-2 lg:col-span-3 flex flex-col border-r border-border overflow-hidden">
          {/* Qidiruv va kategoriyalar */}
          <div className="border-b border-border p-4 shrink-0">
            <div className="relative mb-4">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Mahsulotlarni qidirish..."
                className="w-full rounded-lg bg-background pl-8" // Added w-full
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {/* Kategoriyalar scroll */}
            <ScrollArea className="w-full"> {/* w-full klassi qo'shildi */}
               <div className="flex space-x-2 pb-2">
                 <Button
                  size="sm" // Added size
                  variant={selectedCategory === null ? "default" : "outline"}
                  className="rounded-full whitespace-nowrap"
                  onClick={() => setSelectedCategory(null)}
                >
                  Barchasi
                </Button>
                {isLoadingCategories ? (
                  <p className="text-sm text-muted-foreground p-2">Yuklanmoqda...</p>
                ) : errorCategories ? (
                  <p className="text-sm text-destructive p-2">{errorCategories}</p>
                ) : (
                  Array.isArray(categories) && categories.map((category) => ( // Added check for array
                    <Button
                      size="sm" // Added size
                      key={category.id}
                      variant={selectedCategory === category.id ? "default" : "outline"}
                      className="rounded-full whitespace-nowrap"
                      onClick={() => setSelectedCategory(category.id)}
                    >
                      {category.name}
                    </Button>
                  ))
                )}
              </div>
               <ScrollBar orientation="horizontal" /> {/* Gorizontal scrollbar qo'shildi */}
            </ScrollArea>
          </div>

          {/* Mahsulotlar grid'i - responsiv qilindi */}
          <ScrollArea className="flex-1 p-4">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground">Mahsulotlar yuklanmoqda...</p> {/* Improved text */}
              </div>
            ) : error ? (
              <div className="flex h-full flex-col items-center justify-center text-center p-4">
                <p className="text-destructive mb-4">{error}</p>
                <Button onClick={() => window.location.reload()}>Qayta yuklash</Button>
              </div>
            ) : (
              /* Responsiv mahsulotlar grid'i */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                {filteredProducts.length === 0 ? (
                  <div className="col-span-full flex h-60 items-center justify-center text-muted-foreground text-center p-4">
                     <p>"{searchQuery}" uchun yoki tanlangan kategoriyada mahsulot topilmadi.</p>
                  </div>
                ) : (
                  filteredProducts.map((product) => (
                    <Card
                      key={product.id}
                      className="cursor-pointer overflow-hidden transition-all hover:shadow-lg active:scale-95 flex flex-col rounded-lg border border-border bg-card text-card-foreground shadow-sm" // Added base card styles
                      onClick={() => addToCart(product)}
                    >
                      <CardContent className="p-0 flex-1 flex flex-col">
                        {/* Rasm qismi */}
                        <div className="aspect-square w-full overflow-hidden relative"> {/* aspect-square for consistent height */}
                          <img
                             src={product.image || "/placeholder-product.jpg"} // Use placeholder if image null
                            alt={product.name}
                            className="w-full h-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-105" // Added hover effect
                            onError={(e) => { e.currentTarget.src = "/placeholder-product.jpg"; }} // Placeholder on error
                          />
                        </div>
                        {/* Ma'lumot qismi */}
                        <div className="p-3 flex-grow flex flex-col justify-between">
                           <div>
                            <h3 className="font-semibold text-sm sm:text-base truncate" title={product.name}>{product.name}</h3> {/* Truncate long names */}
                           </div>
                           <p className="text-xs sm:text-sm font-semibold text-primary mt-1">
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

        {/* O'ng taraf - Savat */}
        {/* Cart Section - Spans fewer columns, stays on the right */}
        <div className="md:col-span-1 lg:col-span-2 flex flex-col bg-background overflow-hidden"> {/* Adjusted col-span */}
           {/* Savat header */}
          <div className="flex items-center justify-between border-b border-border p-4 shrink-0 h-16">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-medium">Buyurtma</h2>
            </div>
            {/* Stol tanlash/o'zgartirish tugmasi */}
            {orderType === "dine_in" && (
              <div className="flex items-center gap-2">
                {selectedTable && (
                    <Badge variant="outline" className="text-sm px-2 py-1 whitespace-nowrap">
                        Stol {tables.find((t) => t.id === selectedTable)?.name || selectedTable}
                    </Badge>
                )}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTableDialog(true)}
                    className="whitespace-nowrap"
                >
                 {selectedTable ? "O‘zgartirish" : "Stol tanlash"}
                </Button>
              </div>
            )}
              {/* Mijoz ma'lumotlari ko'rsatkichi (ixtiyoriy) */}
            {(orderType === 'takeaway' || orderType === 'delivery') && customerInfo.name && (
                <Badge variant="secondary" className="text-xs px-2 py-1 whitespace-nowrap truncate" title={`${customerInfo.name}, ${customerInfo.phone}`}>
                    <Users className="h-3 w-3 mr-1"/> {customerInfo.name.split(' ')[0]} {/* Faqat ismni ko'rsatish */}
                </Badge>
            )}
          </div>

            {/* Savat itemlari uchun ScrollArea */}
          <ScrollArea className="flex-1 p-4">
            {cart.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground p-4">
                <ShoppingCart className="mb-4 h-16 w-16 text-gray-400" />
                <h3 className="text-lg font-semibold">Savat bo‘sh</h3>
                <p className="text-sm mt-1">Buyurtma berish uchun mahsulotlarni tanlang</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between space-x-2 border-b border-border pb-3 last:border-b-0">
                     {/* Mahsulot rasmi va nomi */}
                     <div className="flex items-center gap-3 flex-1 min-w-0">
                        <img
                           src={item.product?.image || "/placeholder-product.jpg"}
                           alt={item.product?.name}
                           className="h-10 w-10 rounded-md object-cover shrink-0"
                           onError={(e) => { e.currentTarget.src = "/placeholder-product.jpg"; }}
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm truncate" title={item.product?.name}>{item.product?.name || "Noma'lum"}</h3>
                          <p className="text-xs text-muted-foreground">
                            {Number(item.product?.price || 0).toLocaleString()} so‘m
                          </p>
                        </div>
                    </div>
                     {/* Miqdorni boshqarish */}
                    <div className="flex items-center space-x-1 shrink-0">
                      <Button
                         variant="outline"
                         size="icon"
                         className="h-7 w-7 rounded-full" // Made smaller and round
                        onClick={() => decreaseQuantity(item)}
                        aria-label="Kamaytirish"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                      <Button
                         variant="outline"
                         size="icon"
                         className="h-7 w-7 rounded-full" // Made smaller and round
                        onClick={() => increaseQuantity(item)}
                         aria-label="Oshirish"
                      >
                        <PlusIcon className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                     {/* Umumiy narx */}
                    <div className="text-right shrink-0 w-20"> {/* Added fixed width */}
                      <p className="font-semibold text-sm">
                        {(Number(item.product?.price || 0) * item.quantity).toLocaleString()} so‘m
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

            {/* Savat Footer qismi */}
          <div className="border-t border-border p-4 shrink-0 bg-muted/20"> {/* Added background */}
            <div className="space-y-2 mb-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Jami:</span>
                <span className="font-semibold">
                  {cartTotal.toLocaleString()} so‘m
                </span>
              </div>
               {/* Boshqa to'lovlar (Xizmat haqi, Chegirma) qo'shilishi mumkin */}
               {/*
               <div className="flex justify-between">
                   <span className="text-muted-foreground">Xizmat haqi (10%):</span>
                   <span className="font-medium">{(cartTotal * 0.1).toLocaleString()} so'm</span>
               </div>
               <Separator className="my-1" />
               <div className="flex justify-between text-base font-bold">
                   <span>Umumiy:</span>
                   <span>{(cartTotal * 1.1).toLocaleString()} so'm</span>
               </div>
               */}
            </div>
            {/* <Separator className="my-4" /> */}
            <Button
              className="w-full h-12 text-base font-semibold" // Made bigger
              size="lg"
              disabled={cart.length === 0 || isLoading} // Disable while loading products too
              onClick={submitOrder}
            >
              Buyurtmani Yuborish ({cartTotal.toLocaleString()} so‘m)
            </Button>
          </div>
        </div>
      </div> {/* Main grid tugashi */}

      {/* Stol tanlash dialogi */}
      <Dialog open={showTableDialog} onOpenChange={setShowTableDialog}>
        <DialogContent className="sm:max-w-lg md:max-w-2xl lg:max-w-4xl"> {/* Made wider */}
          <DialogHeader>
            <DialogTitle>Stol tanlash</DialogTitle>
            <DialogDescription>Buyurtma uchun stol raqamini tanlang.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
             {/* Joy tanlash (agar kerak bo'lsa) */}
             {/*
             <div className="mb-4 flex space-x-2">
               <Label htmlFor="place-select" className="mt-2">Joy:</Label>
               <Select value={selectedPlace || ""} onValueChange={(value) => setSelectedPlace(value)}>
                <SelectTrigger id="place-select" className="w-[180px]">
                  <SelectValue placeholder="Joyni tanlang" />
                </SelectTrigger>
                <SelectContent>
                   <SelectItem value="">Barcha joylar</SelectItem>
                  {places.map((place) => (
                    <SelectItem key={place.id} value={place.value}>
                      {place.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            */}
             {/* Stollar grid'i */}
            {isLoadingTables ? (
              <div className="flex justify-center items-center h-40">
                <p className="text-muted-foreground">Stollar yuklanmoqda...</p>
              </div>
            ) : (
               /* Responsiv stollar grid'i */
              <ScrollArea className="max-h-[60vh] pr-3"> {/* Added max height and scroll */}
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4 mt-4">
                  {tables
                    // .filter((table) => !selectedPlace || table.zone === selectedPlace) // Filter by place if needed
                    .map((table) => (
                      <Button
                        key={table.id}
                        variant="outline" // Changed variant
                        className={`h-20 sm:h-24 flex flex-col justify-center items-center rounded-lg shadow-sm transition-all p-2 border-2 ${ // Added border-2
                          !table.is_available
                            ? "bg-destructive/10 border-destructive/30 text-destructive cursor-not-allowed opacity-70" // Destructive colors for busy tables
                            : selectedTable === table.id
                              ? "bg-primary border-primary text-primary-foreground ring-2 ring-primary ring-offset-2" // Primary colors for selected
                              : "bg-green-100 border-green-300 hover:bg-green-200 dark:bg-green-900/30 dark:border-green-700 dark:hover:bg-green-800/30" // Green colors for available
                        }`}
                        disabled={!table.is_available}
                        onClick={() => {
                          setSelectedTable(table.id)
                          setShowTableDialog(false)
                          toast.success(`Stol ${table.name} tanlandi`)
                        }}
                      >
                        <div className="text-center">
                          <div className="font-semibold text-base sm:text-lg">{table.name}</div>
                          <div className={`text-xs mt-1 font-medium ${!table.is_available ? 'text-destructive' : 'text-green-600 dark:text-green-400'}`}>
                             {table.is_available ? "Bo‘sh" : "Band"}
                           </div>
                        </div>
                      </Button>
                    ))}
                    {tables.length === 0 && (
                       <p className="col-span-full text-center text-muted-foreground py-10">Stollar topilmadi.</p>
                    )}
                </div>
              </ScrollArea>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowTableDialog(false)}> {/* Changed to ghost */}
              Bekor qilish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mijoz ma'lumotlari dialogi */}
      <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
        <DialogContent className="sm:max-w-md"> {/* Adjusted width */}
          <DialogHeader>
            <DialogTitle>
              {orderType === "delivery" ? "Yetkazib berish ma‘lumotlari" : "Mijoz ma‘lumotlari"}
            </DialogTitle>
            <DialogDescription>
              {orderType === "delivery"
                ? "Yetkazib berish uchun mijoz ma‘lumotlarini kiriting."
                : "Olib ketish uchun mijoz ma‘lumotlarini kiriting."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
             {/* Inputlar Label bilan birga */}
             <div className="space-y-2">
                 <Label htmlFor="name">Ism*</Label>
                 <Input
                    id="name"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                    placeholder="Mijozning ismi"
                    required
                 />
             </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon*</Label>
              <Input
                id="phone"
                 type="tel" // Use tel type for phone numbers
                value={customerInfo.phone}
                 onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                 placeholder="+998 XX XXX XX XX"
                required
              />
            </div>
            {orderType === "delivery" && (
               <div className="space-y-2">
                <Label htmlFor="address">Manzil*</Label>
                <Input
                  id="address"
                  value={customerInfo.address}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                   placeholder="Yetkazib berish manzili"
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
              onClick={handleCustomerInfoSave} // Bu faqat dialog'ni yopadi
              disabled={
                 // Validatsiya submitOrder funksiyasida qilinadi, bu tugma faqat yopish uchun
                 false
               }
            >
              Saqlash va Davom etish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Chiqish dialog modali */}
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Chiqishni tasdiqlash</DialogTitle>
            <DialogDescription>Rostdan ham tizimdan chiqmoqchimisiz?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex justify-end gap-2"> {/* Adjusted spacing */}
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

