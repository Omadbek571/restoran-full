"use client"

import { useState, useEffect, useMemo } from "react"
// Ikonkalar (keraklilari qo'shildi)
import { Bell, LogOut, Search, ShoppingBag, ShoppingCart, Truck, Users, Minus, Plus as PlusIcon, History, Eye, Edit, Loader2, X, Save, RotateCcw, CheckCircle, Repeat } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import axios from "axios"
import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
// Tooltip komponentlarini to'g'ri import qilish
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export default function POSPage() {
  // === Asosiy State'lar ===
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [tables, setTables] = useState([])
  const [isLoading, setIsLoading] = useState(true) // Chap panel mahsulotlari
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)
  const [isLoadingTables, setIsLoadingTables] = useState(true)
  const [error, setError] = useState("") // Chap panel xatosi
  const [errorCategories, setErrorCategories] = useState("")
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")

  // === O'ng Panel State'lari (Yangi/Tahrirlash Rejimi) ===
  const [editingOrderId, setEditingOrderId] = useState(null); // null = Yangi, ID = Tahrirlash
  const [orderToEdit, setOrderToEdit] = useState(null); // Tahrirlash uchun yuklangan buyurtma
  const [originalOrderItems, setOriginalOrderItems] = useState([]); // TAHRIRLASHNI BOSHLAGANDAGI ASL ITEMLAR (FARQNI ANIQLASH UCHUN)
  const [isEditLoading, setIsEditLoading] = useState(false); // Tahrirlash uchun yuklash jarayoni
  const [editError, setEditError] = useState(null); // Tahrirlash uchun yuklash xatosi
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false); // API'ga o'zgarish YAKUNIY yuborish jarayoni
  const [submitEditError, setSubmitEditError] = useState(null); // O'zgarish yuborishdagi xato
  const [cart, setCart] = useState([]); // Faqat YANGI buyurtma uchun savat

  // === Yangi Buyurtma Uchun Qo'shimcha State'lar ===
  const [orderType, setOrderType] = useState("dine_in")
  const [selectedTable, setSelectedTable] = useState(null)
  const [customerInfo, setCustomerInfo] = useState({ name: "", phone: "", address: "" })
  const [showTableDialog, setShowTableDialog] = useState(false)
  const [showCustomerDialog, setShowCustomerDialog] = useState(false)

  // === Dialog Oynalari State'lari ===
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)

  // === Buyurtmalar Tarixi State'lari ===
  const [orderHistory, setOrderHistory] = useState([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState("")
  const [historySearchQuery, setHistorySearchQuery] = useState("")

  // Helper function to get token
  const getToken = () => {
    if (typeof window !== "undefined") { return localStorage.getItem("token") }
    return null
  }

  // Kategoriyalarni yuklash
  useEffect(() => {
    const token = getToken(); if (!token) { setErrorCategories("Token yo'q"); setIsLoadingCategories(false); return; }
    setIsLoadingCategories(true);
    axios.get("https://oshxonacopy.pythonanywhere.com/api/categories/", { headers: { Authorization: `Bearer ${token}` } })
      .then(res => { setCategories(res.data || []); setIsLoadingCategories(false); })
      .catch(err => { console.error("Kategoriya xato:", err); setErrorCategories("Kategoriyalarni yuklashda xato"); toast.error("Kategoriyalarni yuklashda xato"); setIsLoadingCategories(false); });
  }, []);

  // Mahsulotlarni yuklash
  useEffect(() => {
    const token = getToken(); if (!token) { setError("Token yo'q"); setIsLoading(false); return; }
    setIsLoading(true);
    axios.get("https://oshxonacopy.pythonanywhere.com/api/products/", { headers: { Authorization: `Bearer ${token}` } })
      .then(res => { setProducts(res.data || []); setIsLoading(false); })
      .catch(err => { console.error("Mahsulot xato:", err); setError("Mahsulotlarni yuklashda xato"); toast.error("Mahsulotlarni yuklashda xato"); setIsLoading(false); });
  }, []);

  // Stollarni yuklash
  const fetchTables = () => {
    const token = getToken(); if (!token) { toast.error("Token topilmadi!"); setIsLoadingTables(false); return; }
    setIsLoadingTables(true);
    axios.get("https://oshxonacopy.pythonanywhere.com/api/tables/", { headers: { Authorization: `Bearer ${token}` } })
      .then(res => { setTables(res.data || []); setIsLoadingTables(false); })
      .catch(err => { console.error("Stol xato:", err); toast.error("Stollarni yuklashda xato"); setIsLoadingTables(false); });
  };
  useEffect(() => { fetchTables(); }, []);

  // Buyurtmalar tarixini yuklash
  const fetchOrderHistory = (searchTerm = "") => {
    const token = getToken(); if (!token) { toast.error("Avtorizatsiyadan o'ting."); setHistoryError("Token yo'q"); return; }
    setIsHistoryLoading(true); setHistoryError("");
    let url = `https://oshxonacopy.pythonanywhere.com/api/orders/${searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ''}`;
    axios.get(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => { setOrderHistory(res.data || []); setIsHistoryLoading(false); })
      .catch(err => {
        console.error("Tarix xato:", err);
        let errorMsg = "Tarixni yuklashda xato";
        if (err.response?.status === 401) errorMsg = "Avtorizatsiya xatosi.";
        else if (err.response?.data) errorMsg = `Server xatosi: ${JSON.stringify(err.response.data)}`;
        setHistoryError(errorMsg); toast.error(errorMsg); setIsHistoryLoading(false);
      });
  };
  // Tarix qidiruvi o'zgarganda qayta yuklash
  useEffect(() => {
    if (showHistoryDialog) {
        const handler = setTimeout(() => fetchOrderHistory(historySearchQuery), 300);
        return () => clearTimeout(handler);
    }
  }, [showHistoryDialog, historySearchQuery]);

  // === Buyurtmani O'NG PANELDA tahrirlash uchun yuklash funksiyasi ===
  const loadOrderForEditing = (orderId) => {
    const token = getToken();
    if (!token || !orderId) {
        toast.error("Tahrirlash uchun ID/token yetarli emas.");
        return;
    }
    if (isSubmittingEdit) {
        toast.warn("Iltimos, avvalgi amal tugashini kuting.");
        return;
    }
    if (isEditLoading && editingOrderId === orderId) {
        return;
    }

    console.log("Tahrirlash uchun yuklanmoqda:", orderId);
    setIsEditLoading(true); setEditError(null); setOrderToEdit(null); setCart([]); setEditingOrderId(null); setOriginalOrderItems([]);

    const url = `https://oshxonacopy.pythonanywhere.com/api/orders/${orderId}/`;
    axios.get(url, { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => {
            if (res.data.status === 'completed' || res.data.status === 'cancelled') {
                toast.warn(`Buyurtma #${orderId} (${res.data.status_display}) holatida bo'lgani uchun tahrirlab bo'lmaydi.`);
                setIsEditLoading(false);
                setShowHistoryDialog(true);
                return;
            }

            setOrderToEdit(res.data);
            setOriginalOrderItems(JSON.parse(JSON.stringify(res.data.items || [])));
            setEditingOrderId(orderId);
            setIsEditLoading(false);
            toast.success(`Buyurtma #${orderId} tahrirlash uchun yuklandi.`);

            setShowHistoryDialog(false);
        })
        .catch((err) => {
            console.error(`Buyurtma (${orderId}) tahrirlashga yuklash xato:`, err);
            let errorMsg = `Buyurtma (${orderId}) tahrirlashga yuklashda xato`;
            if (err.response?.status === 401) errorMsg = "Avtorizatsiya xatosi.";
            else if (err.response?.status === 404) errorMsg = `Buyurtma (${orderId}) topilmadi.`;
            else if (err.response?.data) errorMsg = `Server xatosi: ${JSON.stringify(err.response.data)}`;
            setEditError(errorMsg);
            toast.error(errorMsg);
            setIsEditLoading(false);
            setEditingOrderId(null);
            setOriginalOrderItems([]);
            setShowHistoryDialog(true);
        });
  };

  // === Mahsulot miqdorini Faqatgina LOKAL STATEda YANGILASH/QO'SHISH/O'CHIRISH (Tahrirlash rejimi uchun) ===
  const handleLocalEditQuantityChange = (productId, change) => {
      if (!editingOrderId || !orderToEdit || isSubmittingEdit) return;

      setOrderToEdit(prevOrder => {
          if (!prevOrder) return null;
          const updatedItems = [...prevOrder.items];
          const itemIndex = updatedItems.findIndex(item => item.product === productId);

          if (itemIndex > -1) {
              const currentItem = updatedItems[itemIndex];
              const newQuantity = currentItem.quantity + change;

              if (newQuantity <= 0) {
                  updatedItems.splice(itemIndex, 1);
                  console.log(`Lokal o'chirildi: Mahsulot ID ${productId}`);
              } else {
                  updatedItems[itemIndex] = {
                      ...currentItem,
                      quantity: newQuantity,
                  };
                   console.log(`Lokal yangilandi: Mahsulot ID ${productId}, Yangi miqdor ${newQuantity}`);
              }
          } else if (change > 0) {
               console.warn(`handleLocalEditQuantityChange: Mahsulot ID ${productId} topilmadi, lekin qo'shishga harakat qilindi.`);
          }

          return { ...prevOrder, items: updatedItems };
      });
  };

  // Chap paneldagi mahsulot bosilganda LOKAL qo'shish/oshirish (Tahrirlash rejimi uchun)
  const handleLocalAddItemFromProductList = (product) => {
      if (!editingOrderId || !orderToEdit || !product || isSubmittingEdit) return;

      setOrderToEdit(prevOrder => {
          if (!prevOrder) return null;
          const updatedItems = [...prevOrder.items];
          const itemIndex = updatedItems.findIndex(item => item.product === product.id);

          if (itemIndex > -1) {
              const currentItem = updatedItems[itemIndex];
              updatedItems[itemIndex] = { ...currentItem, quantity: currentItem.quantity + 1 };
              console.log(`Lokal miqdor oshirildi (+): Mahsulot ID ${product.id}`);
          } else {
              updatedItems.push({
                  id: `temp-${Date.now()}-${product.id}`,
                  product: product.id,
                  product_details: {
                      id: product.id,
                      name: product.name,
                      image_url: product.image,
                  },
                  quantity: 1,
                  unit_price: product.price,
                  total_price: product.price
              });
               console.log(`Lokal yangi qo'shildi: Mahsulot ID ${product.id}`);
          }
          return { ...prevOrder, items: updatedItems };
      });
  };

  // === Tahrirlangan O'zgarishlarni YAKUNIY APIga Yuborish Funksiyasi ===
  const submitEditedOrderChanges = async () => {
    if (!editingOrderId || !orderToEdit || !originalOrderItems || isSubmittingEdit || isEditLoading) {
      toast.warn("Hozirda o'zgarishlarni saqlash mumkin emas. Yuklanmoqda yoki boshqa jarayon ketmoqda.");
      return;
    }

    const token = getToken();
    if (!token) {
      toast.error("Avtorizatsiya tokeni topilmadi!");
      return;
    }

    const currentItems = orderToEdit.items || [];
    const operations = [];

    // 1. Yangi qo'shilganlarni aniqlash ("add")
    currentItems.forEach((currentItem) => {
      const originalItem = originalOrderItems.find((o) => o.product === currentItem.product);
      if (!originalItem) {
        operations.push({
          operation: "add",
          product_id: currentItem.product,
          quantity: currentItem.quantity,
        });
        console.log(`Operatsiya (Add): Mahsulot ID ${currentItem.product}, Miqdor ${currentItem.quantity}`);
      }
    });

    // 2. O'zgarganlarni aniqlash ("set") va o'chirilganlarni aniqlash ("remove")
    originalOrderItems.forEach((originalItem) => {
      const currentItem = currentItems.find((c) => c.product === originalItem.product);
      if (currentItem) {
        if (currentItem.quantity !== originalItem.quantity) {
          operations.push({
            operation: "set",
            order_item_id: originalItem.id,
            quantity: currentItem.quantity,
          });
          console.log(`Operatsiya (Set): OrderItemID ${originalItem.id}, Yangi miqdor ${currentItem.quantity}`);
        }
      } else {
        operations.push({
          operation: "remove",
          order_item_id: originalItem.id,
        });
        console.log(`Operatsiya (Remove): OrderItemID ${originalItem.id}`);
      }
    });

    if (operations.length === 0) {
      toast.info("Hech qanday o'zgarish qilinmadi.");
      finishEditingInternal();
      return;
    }

    setIsSubmittingEdit(true);
    setSubmitEditError(null);

    const payload = {
      items_operations: operations,
    };

    const url = `https://oshxonacopy.pythonanywhere.com/api/orders/${editingOrderId}/update-items/`;
    console.log("API so'rovi yuborilmoqda:", JSON.stringify(payload, null, 2));

    try {
      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("API javobi:", response.data);
      toast.success(`Buyurtma #${editingOrderId} muvaffaqiyatli yangilandi!`);

      finishEditingInternal();

      if (showHistoryDialog) {
        fetchOrderHistory(historySearchQuery);
      }
    } catch (err) {
      console.error("API xatosi:", err.response || err);
      let errorMsg = "O'zgarishlarni saqlashda xato yuz berdi.";
      
      if (err.response) {
        const { status, data } = err.response;
        if (status === 400) {
          if (data?.detail) {
            errorMsg = data.detail;
          } else if (data?.items_operations) {
            errorMsg = data.items_operations
              .map((opError, index) => opError ? `Operatsiya ${index + 1}: ${JSON.stringify(opError)}` : null)
              .filter(Boolean)
              .join("; ") || "Validatsiya xatosi.";
          } else {
            errorMsg = JSON.stringify(data);
          }
        } else if (status === 401) {
          errorMsg = "Avtorizatsiya xatosi.";
        } else if (status === 403) {
          errorMsg = "Ruxsat yo'q.";
        } else if (status === 404) {
          errorMsg = "Buyurtma yoki element topilmadi.";
        } else {
          errorMsg = `Server xatosi (${status}): ${JSON.stringify(data)}`;
        }
      } else {
        errorMsg = `Ulanish xatosi: ${err.message}`;
      }

      setSubmitEditError(errorMsg);
      toast.error(errorMsg, { autoClose: 5000 });
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // === YANGI: Tayyor Buyurtmani O'sha Stolga Qayta Jo'natish Funksiyasi ===
  const reorderToSameTable = (order) => {
    const token = getToken();
    if (!token) {
      toast.error("Avtorizatsiya tokeni topilmadi!");
      return;
    }

    if (order.status !== "completed") {
      toast.warn("Bu funksiya faqat tayyor (completed) buyurtmalar uchun ishlaydi.");
      return;
    }

    if (!order.table_id && order.order_type === "dine_in") {
      toast.error("Stol ma'lumotlari topilmadi.");
      return;
    }

    // Yangi buyurtma uchun ma'lumotlarni tayyorlash
    const orderData = {
      order_type: order.order_type,
      table_id: order.order_type === "dine_in" ? order.table_id : null,
      customer_name: (order.order_type === "takeaway" || order.order_type === "delivery") ? order.customer_name : null,
      customer_phone: (order.order_type === "takeaway" || order.order_type === "delivery") ? order.customer_phone : null,
      customer_address: order.order_type === "delivery" ? order.customer_address : null,
      items: order.items.map((item) => ({
        product_id: item.product,
        quantity: item.quantity,
      })),
    };

    console.log("Qayta buyurtma ma'lumotlari:", orderData);

    // API'ga yangi buyurtma so'rovini yuborish
    toast.promise(
      axios.post("https://oshxonacopy.pythonanywhere.com/api/orders/", orderData, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      {
        pending: "Qayta buyurtma yuborilmoqda...",
        success: "Qayta buyurtma muvaffaqiyatli yaratildi!",
        error: {
          render({ data }) {
            console.error("Qayta buyurtma xato:", data);
            let msg = "Noma'lum xato!";
            if (data?.response?.data) {
              try {
                const errorData = data.response.data;
                if (typeof errorData === "string") msg = errorData;
                else if (errorData.detail) msg = errorData.detail;
                else if (typeof errorData === "object")
                  msg = Object.entries(errorData)
                    .map(([k, v]) => `${k}:${Array.isArray(v) ? v.join(",") : v}`)
                    .join(";");
              } catch (e) {
                console.error(e);
              }
            } else if (data?.response?.status) msg = `Server xatosi (${data.response.status})`;
            else if (data?.message) msg = data.message;
            return `Xatolik: ${msg}`;
          },
        },
      }
    )
      .then((res) => {
        // Yangi buyurtma yaratilgandan so'ng state'larni yangilash
        setOrderType(order.order_type);
        if (order.order_type === "dine_in") {
          setSelectedTable(order.table_id);
        } else {
          setCustomerInfo({
            name: order.customer_name || "",
            phone: order.customer_phone || "",
            address: order.customer_address || "",
          });
        }

        // Cart'ni yangi buyurtma elementlari bilan to'ldirish
        const newCart = order.items.map((item) => ({
          id: item.product,
          product: item.product_details,
          quantity: item.quantity,
        }));
        setCart(newCart);

        // Tahrirlash rejimini o'chirish (yangi buyurtma rejimiga o'tish)
        setEditingOrderId(null);
        setOrderToEdit(null);
        setOriginalOrderItems([]);

        // Tarix dialogini yopish
        setShowHistoryDialog(false);
        fetchTables();
        if (showHistoryDialog) fetchOrderHistory(historySearchQuery);
      })
      .catch((err) => {
        console.error("Qayta buyurtma catch xato:", err.response || err);
      });
  };

  const fetchOrderDetailsForEditing = (orderId) => {
       const token = getToken(); if (!token || !orderId) return;
       loadOrderForEditing(orderId);
  }

  // === Yangi Buyurtma Yaratish Funksiyalari ===
  const addToCart = (product) => {
     if (editingOrderId) return;
     if (!product?.id) { toast.error("Mahsulot qo'shishda xatolik."); return; }
    setCart((prev) => {
        const exist = prev.find((i) => i.id === product.id);
        if (exist) return prev.map((i) => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
        else return [...prev, { id: product.id, product: product, quantity: 1 }];
    });
    toast.success(`${product.name} savatga qo'shildi!`);
  }
  const decreaseQuantity = (item) => {
     if (editingOrderId) return;
     if (!item?.id) return;
    setCart((prev) => {
        const current = prev.find((i) => i.id === item.id);
        if (current?.quantity === 1) {
            toast.info(`${item.product?.name || 'Mahsulot'} savatdan o‘chirildi`);
            return prev.filter((i) => i.id !== item.id);
        } else {
            return prev.map((i) => i.id === item.id ? { ...i, quantity: Math.max(0, i.quantity - 1) } : i);
        }
    });
  }
  const increaseQuantity = (item) => {
     if (editingOrderId) return;
     if (!item?.id) return;
    setCart((prev) => prev.map((i) => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
  }
  const submitOrder = () => {
     if (editingOrderId) return;
    const token = getToken(); if (!token) { toast.error("Avtorizatsiya tokeni topilmadi!"); return; }
    if (cart.length === 0) { toast.warn("Savat bo‘sh!"); return; }
    if (orderType === "dine_in" && !selectedTable) { toast.warn("Stol tanlang!"); setShowTableDialog(true); return; }
    if ((orderType === "takeaway" || orderType === "delivery") && (!customerInfo.name || !customerInfo.phone)) { setShowCustomerDialog(true); toast.warn("Mijoz nomi va raqamini kiriting!"); return; }
    if (orderType === "delivery" && !customerInfo.address) { setShowCustomerDialog(true); toast.warn("Yetkazish manzilini kiriting!"); return; }

    const orderData = {
      order_type: orderType,
      table_id: orderType === "dine_in" ? selectedTable : null,
      customer_name: (orderType === "takeaway" || orderType === "delivery") ? customerInfo.name : null,
      customer_phone: (orderType === "takeaway" || orderType === "delivery") ? customerInfo.phone : null,
      customer_address: orderType === "delivery" ? customerInfo.address : null,
      items: cart.map((item) => ({ product_id: item.id, quantity: item.quantity })),
    }
    console.log("Yangi buyurtma:", orderData);
    toast.promise(
      axios.post("https://oshxonacopy.pythonanywhere.com/api/orders/", orderData, { headers: { Authorization: `Bearer ${token}` } }),
       {
         pending: 'Buyurtma yuborilmoqda...',
         success: 'Buyurtma muvaffaqiyatli yaratildi!',
         error: { render({data}){ console.error("Yangi buyurtma xato:", data); let msg = "Noma'lum xato!"; if(data?.response?.data){ try{ const errorData = data.response.data; if(typeof errorData === 'string') msg=errorData; else if(errorData.detail) msg=errorData.detail; else if(typeof errorData === 'object') msg=Object.entries(errorData).map(([k,v])=>`${k}:${Array.isArray(v)?v.join(','):v}`).join(';');}catch(e){console.error(e)}} else if(data?.response?.status) msg=`Server xatosi (${data.response.status})`; else if(data?.message) msg=data.message; return `Xatolik: ${msg}`; } }
       }
    ).then(() => {
        setCart([]); setCustomerInfo({ name: "", phone: "", address: "" }); setSelectedTable(null);
        setShowCustomerDialog(false); setShowTableDialog(false); fetchTables();
        if (showHistoryDialog) fetchOrderHistory(historySearchQuery);
      })
      .catch((err) => { console.error("Yangi buyurtma catch xato:", err.response || err); });
  }
  const handleCustomerInfoSave = () => {
     if (!customerInfo.name || !customerInfo.phone) { toast.warn("Ism va raqamni kiriting!"); return; }
     if (orderType === "delivery" && !customerInfo.address) { toast.warn("Manzilni kiriting!"); return; }
    setShowCustomerDialog(false); toast.info("Mijoz ma'lumotlari kiritildi.");
  }

  // === Tahrirlash Rejimini Yakunlash (Ichki funksiya - state tozalash) ===
  const finishEditingInternal = () => {
      const previousId = editingOrderId;
      setEditingOrderId(null);
      setOrderToEdit(null);
      setOriginalOrderItems([]);
      setIsEditLoading(false);
      setEditError(null);
      setSubmitEditError(null);
      setCart([]);
      if (showHistoryDialog && previousId) {
         setTimeout(() => fetchOrderHistory(historySearchQuery), 100);
      }
  }

   // === Tahrirlashni Bekor Qilish Tugmasi uchun Funksiya ===
   const cancelEditing = () => {
     if (isSubmittingEdit) {
         toast.warn("Yakuniy saqlash jarayoni ketmoqda, bekor qilib bo'lmaydi.");
         return;
     }
     const previousId = editingOrderId;
     toast.info(`Buyurtma #${previousId} tahrirlash bekor qilindi.`);
     finishEditingInternal();
 }

  // === Boshqa Funksiyalar ===
  const handleLogout = () => { localStorage.removeItem("token"); window.location.href = "/auth"; toast.info("Tizimdan chiqildi"); }
  const formatDateTime = (d) => { if (!d) return "N/A"; try { return new Date(d).toLocaleString('uz-UZ', { year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false }); } catch (e) { return d; } };

  // === Memoized Qiymatlar ===
  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    return products.filter((p) => {
      if (!p.is_active) return false;
      const nameMatch = p.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const catMatch = selectedCategory === null || p.category?.id === selectedCategory;
      return nameMatch && catMatch;
    });
  }, [products, selectedCategory, searchQuery]);

  const currentPanelItems = useMemo(() => {
      if (editingOrderId && orderToEdit?.items) {
          return orderToEdit.items;
      } else if (!editingOrderId) {
          return cart;
      } else {
          return [];
      }
  }, [editingOrderId, orderToEdit, cart]);

  const currentPanelTotal = useMemo(() => {
      if (editingOrderId && orderToEdit?.items) {
           return orderToEdit.items.reduce((sum, item) => sum + (Number(item.unit_price || 0) * item.quantity), 0);
      } else if (!editingOrderId) {
          return cart.reduce((total, item) => total + (parseFloat(item.product?.price) || 0) * item.quantity, 0);
      } else {
          return 0;
      }
  }, [editingOrderId, orderToEdit, cart]);

  // === UI QISMI (RETURN) ===
  return (
    <TooltipProvider>
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

            {/* Header */}
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-4 sm:px-6 shrink-0">
                <div className="flex items-center gap-2 sm:gap-4">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" className="shrink-0" onClick={() => setShowLogoutDialog(true)}>
                                <LogOut className="h-5 w-5" />
                                <span className="sr-only">Chiqish</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Tizimdan Chiqish</p>
                        </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" className="shrink-0" onClick={() => { setHistorySearchQuery(''); fetchOrderHistory(); setShowHistoryDialog(true); }}>
                                <History className="h-5 w-5" />
                                <span className="sr-only">Buyurtmalar Tarixi</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Buyurtmalar Tarixi</p>
                        </TooltipContent>
                    </Tooltip>

                    <h1 className="text-lg sm:text-xl font-bold hidden md:inline-block">SmartResto POS</h1>
                </div>

                <div className="flex-1 flex justify-center px-4">
                    <Tabs
                        value={editingOrderId ? '' : orderType}
                        onValueChange={editingOrderId ? () => {} : setOrderType}
                        className={`w-full max-w-md ${editingOrderId ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <TabsList className="grid w-full grid-cols-3 h-11">
                            <TabsTrigger value="dine_in" disabled={!!editingOrderId} className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-1">
                                <Users className="h-4 w-4" />
                                <span className="hidden sm:inline">Shu yerda</span>
                                <span className="sm:hidden">Ichkarida</span>
                            </TabsTrigger>
                            <TabsTrigger value="takeaway" disabled={!!editingOrderId} className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-1">
                                <ShoppingBag className="h-4 w-4" />
                                <span className="hidden sm:inline">Olib ketish</span>
                                <span className="sm:hidden">Olib k.</span>
                            </TabsTrigger>
                            <TabsTrigger value="delivery" disabled={!!editingOrderId} className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-1">
                                <Truck className="h-4 w-4" />
                                <span className="hidden sm:inline">Yetkazish</span>
                                <span className="sm:hidden">Yetkaz.</span>
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                <div className="flex items-center gap-2 sm:gap-4">
                    {/* Bildirishnomalar uchun joy (agar kerak bo'lsa) */}
                </div>
            </header>

            {/* Asosiy Kontent */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-0 overflow-hidden">

                {/* Chap taraf - Mahsulotlar */}
                <div className="md:col-span-2 lg:col-span-3 flex flex-col border-r border-border overflow-hidden">
                    <div className="border-b border-border p-4 shrink-0">
                        <div className="relative mb-4">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Mahsulotlarni qidirish..."
                                className="w-full rounded-lg bg-background pl-8"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <ScrollArea className="w-full">
                            <div className="flex space-x-2 pb-2">
                                <Button
                                    size="sm"
                                    variant={selectedCategory === null ? "default" : "outline"}
                                    className="rounded-full whitespace-nowrap px-4"
                                    onClick={() => setSelectedCategory(null)}
                                >
                                    Barchasi
                                </Button>
                                {isLoadingCategories ? (
                                    <div className="flex items-center space-x-2 text-sm text-muted-foreground p-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Yuklanmoqda...</span>
                                    </div>
                                ) : errorCategories ? (
                                    <p className="text-sm text-destructive p-2">{errorCategories}</p>
                                ) : (
                                    Array.isArray(categories) && categories.map((category) => (
                                        <Button
                                            size="sm"
                                            key={category.id}
                                            variant={selectedCategory === category.id ? "default" : "outline"}
                                            className="rounded-full whitespace-nowrap px-4"
                                            onClick={() => setSelectedCategory(category.id)}
                                        >
                                            {category.name}
                                        </Button>
                                    ))
                                )}
                            </div>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    </div>

                    <ScrollArea className="flex-1 p-4">
                        {isLoading ? (
                            <div className="flex h-full items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <p className="text-muted-foreground ml-2">Mahsulotlar yuklanmoqda...</p>
                            </div>
                        ) : error ? (
                            <div className="flex h-full flex-col items-center justify-center text-center p-4">
                                <p className="text-destructive mb-4">{error}</p>
                                <Button onClick={() => { setIsLoading(true); setError(''); /* fetchProducts() ni qayta chaqirish kerak */ }}>Qayta yuklash</Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                                {filteredProducts.length === 0 ? (
                                    <div className="col-span-full flex h-60 items-center justify-center text-muted-foreground text-center p-4">
                                        <p>"{searchQuery}" {selectedCategory ? `uchun "${categories.find(c=>c.id===selectedCategory)?.name}"` : ''} kategoriyasida aktiv mahsulot topilmadi.</p>
                                    </div>
                                ) : (
                                    filteredProducts.map((product) => (
                                        <Card
                                            key={product.id}
                                            className={`cursor-pointer overflow-hidden transition-all hover:shadow-lg active:scale-95 flex flex-col rounded-lg border border-border bg-card text-card-foreground shadow-sm group ${isSubmittingEdit ? 'opacity-70 pointer-events-none' : ''}`}
                                            onClick={() => {
                                                if (isSubmittingEdit) return;

                                                if (editingOrderId) {
                                                    handleLocalAddItemFromProductList(product);
                                                } else {
                                                    addToCart(product);
                                                }
                                            }}
                                        >
                                            <CardContent className="p-0 flex-1 flex flex-col">
                                                <div className="aspect-square w-full overflow-hidden relative">
                                                    <img
                                                        src={product.image || "/placeholder-product.jpg"}
                                                        alt={product.name}
                                                        className="w-full h-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
                                                        onError={(e) => { e.currentTarget.src = "/placeholder-product.jpg"; }}
                                                        loading="lazy"
                                                    />
                                                </div>
                                                <div className="p-3 flex-grow flex flex-col justify-between">
                                                    <div>
                                                        <h3 className="font-semibold text-sm sm:text-base line-clamp-2" title={product.name}>{product.name}</h3>
                                                    </div>
                                                    <p className="text-xs sm:text-sm font-semibold text-primary mt-1">
                                                        {Number(product.price).toLocaleString('uz-UZ')} so‘m
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

                {/* O'ng taraf - Savat / Tahrirlash Paneli */}
                <div className="md:col-span-1 lg:col-span-2 flex flex-col bg-background overflow-hidden">
                    <div className="flex items-center justify-between border-b border-border p-4 shrink-0 h-16">
                        <div className="flex items-center space-x-2">
                            {isEditLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : editingOrderId ? <Edit className="h-5 w-5 text-primary" /> : <ShoppingCart className="h-5 w-5 text-muted-foreground" />}
                            <h2 className="text-lg font-medium">
                                {isEditLoading ? "Yuklanmoqda..." : editingOrderId ? `Tahrirlash #${editingOrderId}` : "Yangi Buyurtma"}
                            </h2>
                        </div>
                        <div className="flex items-center gap-2">
                            {editingOrderId ? (
                                <>
                                    {orderToEdit?.table && (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Badge variant="outline" className="text-sm px-2 py-1">Stol {orderToEdit.table.name}</Badge>
                                            </TooltipTrigger>
                                            <TooltipContent><p>Joy: {orderToEdit.table.zone || 'N/A'}</p></TooltipContent>
                                        </Tooltip>
                                    )}
                                    {orderToEdit?.customer_name && (
                                         <Tooltip>
                                             <TooltipTrigger asChild>
                                                <Badge variant="secondary" className="text-xs px-2 py-1 max-w-[100px] truncate"><Users className="h-3 w-3 mr-1"/>{orderToEdit.customer_name}</Badge>
                                             </TooltipTrigger>
                                             <TooltipContent><p>{orderToEdit.customer_name}</p><p>{orderToEdit.customer_phone}</p>{orderToEdit.customer_address && <p>{orderToEdit.customer_address}</p>}</TooltipContent>
                                         </Tooltip>
                                    )}
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" onClick={cancelEditing} disabled={isSubmittingEdit || isEditLoading}>
                                                <X className="h-5 w-5 text-destructive" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Tahrirlashni Bekor Qilish</p></TooltipContent>
                                    </Tooltip>
                                </>
                            ) : (
                                <>
                                    {orderType === "dine_in" && (
                                        <>
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
                                                disabled={isLoadingTables}
                                            >
                                                {selectedTable ? "O‘zgartirish" : "Stol tanlash"}
                                            </Button>
                                        </>
                                    )}
                                    {(orderType === 'takeaway' || orderType === 'delivery') && customerInfo.name && (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Badge variant="secondary" className="text-xs px-2 py-1 whitespace-nowrap truncate max-w-[100px] cursor-pointer" onClick={() => setShowCustomerDialog(true)}>
                                                    <Users className="h-3 w-3 mr-1" /> {customerInfo.name.split(' ')[0]}
                                                </Badge>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{customerInfo.name}, {customerInfo.phone}</p>
                                                {orderType === 'delivery' && <p>{customerInfo.address}</p>}
                                                <p className="text-xs text-muted-foreground">(O'zgartirish uchun bosing)</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    )}
                                    {(orderType === 'takeaway' || orderType === 'delivery') && !customerInfo.name && (
                                        <Button variant="outline" size="sm" onClick={() => setShowCustomerDialog(true)}>
                                            Mijoz kiritish
                                        </Button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    <ScrollArea className="flex-1 p-4">
                         {isEditLoading ? (
                             <div className="flex h-full items-center justify-center text-muted-foreground">
                                 <Loader2 className="h-8 w-8 animate-spin mr-2" /> Buyurtma yuklanmoqda...
                             </div>
                         ) : editError ? (
                             <div className="flex h-full flex-col items-center justify-center text-destructive p-4 text-center">
                                <p className="mb-3">{editError}</p>
                                <Button variant="outline" size="sm" onClick={()=>loadOrderForEditing(editingOrderId)} disabled={isEditLoading || isSubmittingEdit}>
                                    <RotateCcw className="mr-2 h-4 w-4"/> Qayta Urinish
                                </Button>
                             </div>
                         ) : currentPanelItems.length === 0 ? (
                            <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground p-4">
                                 <ShoppingCart className="mb-4 h-16 w-16 text-gray-400" />
                                 <h3 className="text-lg font-semibold">{editingOrderId ? "Buyurtmada mahsulot yo'q" : "Savat bo‘sh"}</h3>
                                 <p className="text-sm mt-1">{editingOrderId ? "Chapdan mahsulot tanlab qo'shing" : "Yangi buyurtma uchun mahsulot tanlang"}</p>
                             </div>
                        ) : (
                            <div className="space-y-3">
                                {currentPanelItems.map((item) => {
                                    const productInfo = editingOrderId ? item.product_details : item.product;
                                    const productName = productInfo?.name;
                                    const productImage = editingOrderId ? productInfo?.image_url : productInfo?.image;
                                    const unitPrice = editingOrderId ? item.unit_price : productInfo?.price;
                                    const productId = editingOrderId ? item.product : item.id;
                                    const itemKey = editingOrderId ? (item.id || `item-${item.product}`) : item.id;

                                    return (
                                        <div key={itemKey} className={`flex items-center justify-between space-x-2 border-b border-border pb-3 last:border-b-0 ${isSubmittingEdit ? 'opacity-70' : ''}`}>
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <img
                                                    src={productImage || "/placeholder-product.jpg"}
                                                    alt={productName || 'Mahsulot'}
                                                    className="h-10 w-10 rounded-md object-cover shrink-0"
                                                    onError={(e) => { e.currentTarget.src = "/placeholder-product.jpg"; }}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-medium text-sm truncate" title={productName}>{productName || `ID: ${productId}`}</h3>
                                                    <p className="text-xs text-muted-foreground">
                                                        {Number(unitPrice || 0).toLocaleString('uz-UZ')} so‘m
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-1 shrink-0">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-7 w-7 rounded-full"
                                                    onClick={() => editingOrderId ? handleLocalEditQuantityChange(productId, -1) : decreaseQuantity(item)}
                                                    disabled={isSubmittingEdit || isEditLoading}
                                                    aria-label="Kamaytirish"
                                                >
                                                    <Minus className="h-3.5 w-3.5" />
                                                </Button>
                                                <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-7 w-7 rounded-full"
                                                    onClick={() => editingOrderId ? handleLocalEditQuantityChange(productId, 1) : increaseQuantity(item)}
                                                    disabled={isSubmittingEdit || isEditLoading}
                                                    aria-label="Oshirish"
                                                >
                                                     <PlusIcon className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                            <div className="text-right shrink-0 w-24">
                                                <p className="font-semibold text-sm">
                                                    {(Number(unitPrice || 0) * item.quantity).toLocaleString('uz-UZ')} so‘m
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                         {submitEditError && (
                             <p className="text-center text-destructive text-xs mt-4 p-2 bg-destructive/10 rounded">{submitEditError}</p>
                         )}
                    </ScrollArea>

                    <div className="border-t border-border p-4 shrink-0 bg-muted/20">
                        <div className="space-y-2 mb-4 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Jami (taxminiy):</span>
                                <span className="font-semibold"> {currentPanelTotal.toLocaleString('uz-UZ')} so‘m </span>
                            </div>
                            {editingOrderId && orderToEdit && (
                                <>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Holati:</span>
                                        <Badge variant={ orderToEdit.status === 'completed' ? 'success' : orderToEdit.status === 'cancelled' ? 'destructive' : 'outline' } className="capitalize">
                                            {orderToEdit.status_display || orderToEdit.status}
                                        </Badge>
                                    </div>
                                     {Number(orderToEdit.service_fee_percent || 0) > 0 && <div className="flex justify-between text-xs"><span className="text-muted-foreground">Xizmat haqi:</span><span>{orderToEdit.service_fee_percent}%</span></div>}
                                     {Number(orderToEdit.tax_percent || 0) > 0 && <div className="flex justify-between text-xs"><span className="text-muted-foreground">Soliq:</span><span>{orderToEdit.tax_percent}%</span></div>}
                                </>
                            )}
                        </div>
                        {editingOrderId ? (
                            <Button
                                className="w-full h-12 text-base font-semibold"
                                size="lg"
                                onClick={submitEditedOrderChanges}
                                disabled={isSubmittingEdit || isEditLoading}
                                variant="default"
                            >
                                {isSubmittingEdit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                O'zgarishlarni Saqlash
                            </Button>
                        ) : (
                            <Button
                                className="w-full h-12 text-base font-semibold"
                                size="lg"
                                disabled={cart.length === 0 || isLoading || isEditLoading || isSubmittingEdit || (orderType === 'dine_in' && !selectedTable) || ((orderType === 'takeaway' || orderType === 'delivery') && (!customerInfo.name || !customerInfo.phone)) || (orderType === 'delivery' && !customerInfo.address)}
                                onClick={submitOrder}
                            >
                                Buyurtma Berish ({currentPanelTotal.toLocaleString('uz-UZ')} so‘m)
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Stol tanlash dialogi */}
            <Dialog open={showTableDialog} onOpenChange={setShowTableDialog}>
                <DialogContent className="sm:max-w-lg md:max-w-2xl lg:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Stol tanlash</DialogTitle>
                        <DialogDescription>Yangi buyurtma uchun stol raqamini tanlang.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        {isLoadingTables ? (
                            <div className="flex justify-center items-center h-40">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                <p className="text-muted-foreground ml-2">Stollar yuklanmoqda...</p>
                            </div>
                        ) : tables.length === 0 ? (
                            <p className="col-span-full text-center text-muted-foreground py-10">Stollar topilmadi.</p>
                        ) : (
                            <ScrollArea className="max-h-[60vh] pr-3">
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4 mt-4">
                                    {tables
                                        .sort((a, b) => (parseInt(a.name) || a.name) > (parseInt(b.name) || b.name) ? 1 : -1)
                                        .map((table) => (
                                            <Button
                                                key={table.id}
                                                variant="outline"
                                                className={`h-20 sm:h-24 flex flex-col justify-center items-center rounded-lg shadow-sm transition-all p-2 border-2 ${!table.is_available ? "bg-destructive/10 border-destructive/30 text-destructive cursor-not-allowed opacity-70 hover:bg-destructive/15" : selectedTable === table.id ? "bg-primary border-primary text-primary-foreground ring-2 ring-primary ring-offset-2" : "bg-green-100 border-green-300 hover:bg-green-200 dark:bg-green-900/30 dark:border-green-700 dark:hover:bg-green-800/30"}`}
                                                onClick={() => {
                                                    setSelectedTable(table.id);
                                                    setShowTableDialog(false);
                                                    toast.success(`Stol ${table.name} tanlandi`);
                                                }}
                                            >
                                                <div className="text-center">
                                                    <div className="font-semibold text-base sm:text-lg">{table.name}</div>
                                                    <div className={`text-xs mt-1 font-medium ${!table.is_available ? 'text-destructive dark:text-destructive/80' : 'text-green-600 dark:text-green-400'}`}>
                                                        {table.is_available ? "Bo‘sh" : "Band"}
                                                    </div>
                                                    {table.zone && <div className="text-[10px] text-muted-foreground mt-0.5">({table.zone})</div>}
                                                </div>
                                            </Button>
                                        ))}
                                </div>
                            </ScrollArea>
                        )}
                    </div>
                    <DialogFooter>
                         <DialogClose asChild>
                             <Button variant="ghost">Bekor qilish</Button>
                         </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Mijoz ma'lumotlari dialogi */}
            <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {orderType === "delivery" ? "Yetkazib berish ma‘lumotlari" : "Mijoz ma‘lumotlari"}
                        </DialogTitle>
                        <DialogDescription>
                            {orderType === "delivery" ? "Yetkazib berish uchun mijoz ma‘lumotlarini kiriting." : "Olib ketish uchun mijoz ma‘lumotlarini kiriting."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="customer-name-dialog">Ism*</Label>
                            <Input id="customer-name-dialog" value={customerInfo.name} onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })} placeholder="Mijozning ismi" required/>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="customer-phone-dialog">Telefon*</Label>
                            <Input id="customer-phone-dialog" type="tel" value={customerInfo.phone} onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })} placeholder="+998 XX XXX XX XX" required/>
                        </div>
                        {orderType === "delivery" && (
                            <div className="space-y-2">
                                <Label htmlFor="customer-address-dialog">Manzil*</Label>
                                <Input
                                    id="customer-address-dialog"
                                    value={customerInfo.address}
                                    onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                                    placeholder="Yetkazib berish manzili"
                                    required
                                />
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Bekor qilish</Button>
                        </DialogClose>
                        <Button
                            onClick={handleCustomerInfoSave}
                            disabled={
                                !customerInfo.name ||
                                !customerInfo.phone ||
                                (orderType === "delivery" && !customerInfo.address)
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
                        <DialogDescription>Rostdan ham tizimdan chiqmoqchimisiz?</DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4 flex justify-end gap-2">
                        <DialogClose asChild>
                            <Button variant="outline">Bekor qilish</Button>
                        </DialogClose>
                        <Button variant="destructive" onClick={handleLogout}>
                            Chiqish
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Buyurtmalar Tarixi dialogi */}
            <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
                <DialogContent className="sm:max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-7xl h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Buyurtmalar Tarixi</DialogTitle>
                        <DialogDescription>O'tgan buyurtmalarni ko'rish va tahrirlash uchun ustiga bosing.</DialogDescription>
                    </DialogHeader>
                    <div className="px-6 py-2">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                type="search" 
                                placeholder="ID, mijoz, tel, stol bo'yicha qidirish..." 
                                className="w-full rounded-lg bg-background pl-8" 
                                value={historySearchQuery} 
                                onChange={(e) => setHistorySearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-hidden px-1">
                        <ScrollArea className="h-full px-5 pb-6">
                            {isHistoryLoading ? (
                                <div className="flex h-full items-center justify-center text-muted-foreground">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" /> Yuklanmoqda...
                                </div>
                            ) : historyError ? (
                                <div className="flex h-full items-center justify-center text-destructive">{historyError}</div>
                            ) : orderHistory.length === 0 ? (
                                <div className="flex h-full items-center justify-center text-muted-foreground">
                                    {historySearchQuery ? `"${historySearchQuery}" uchun buyurtma topilmadi.` : "Buyurtmalar tarixi hozircha bo'sh."}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {[...orderHistory]
                                        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) // Oxirgisidan boshlab
                                        .map((order) => (
                                        <Card
                                            key={order.id}
                                            className={`overflow-hidden shadow-sm hover:shadow-md transition-shadow relative ${order.status === 'completed' || order.status === 'cancelled' ? 'opacity-60' : 'cursor-pointer'}`}
                                            onClick={() => {
                                                if (order.status === 'completed' || order.status === 'cancelled') {
                                                     toast.warn(`Bu buyurtma (${order.status_display}) holatida, tahrirlab bo'lmaydi.`);
                                                     return;
                                                }
                                                if (isEditLoading || isSubmittingEdit) {
                                                    toast.info("Iltimos, avvalgi amal tugashini kuting.");
                                                    return;
                                                }
                                                loadOrderForEditing(order.id);
                                            }}
                                        >
                                            <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-6 md:grid-cols-8 gap-x-4 gap-y-2 text-sm">
                                                <div className="sm:col-span-2 md:col-span-2 space-y-1"> 
                                                    <div className="font-medium">ID: <span className="text-primary font-semibold">{order.id}</span></div> 
                                                    <div className="text-muted-foreground text-xs">{formatDateTime(order.created_at)}</div> 
                                                </div>
                                                <div className="sm:col-span-2 md:col-span-2 space-y-1 flex flex-col items-start"> 
                                                    <Badge variant="outline">{order.order_type_display || order.order_type}</Badge> 
                                                    <Badge 
                                                        variant={ 
                                                            order.status === 'completed' ? 'success' : 
                                                            order.status === 'pending' || order.status === 'ready' ? 'secondary' : 
                                                            order.status === 'paid' ? 'default' : 
                                                            order.status === 'cancelled' ? 'destructive' : 'outline' 
                                                        } 
                                                        className="mt-1 capitalize"
                                                    > 
                                                        {order.status_display || order.status} 
                                                    </Badge> 
                                                </div>
                                                <div className="sm:col-span-2 md:col-span-2 space-y-1"> 
                                                    {order.customer_name && <div className="truncate" title={order.customer_name}>Mijoz: <span className="font-medium">{order.customer_name}</span></div>} 
                                                    {order.table_name && <div>Stol: <span className="font-medium">{order.table_name}</span></div>} 
                                                    {order.customer_phone && <div className="text-xs text-muted-foreground">{order.customer_phone}</div>} 
                                                </div>
                                                <div className="sm:col-span-6 md:col-span-2 space-y-1 text-right sm:text-left md:text-right pt-2 sm:pt-0 md:pt-0"> 
                                                    <div className="font-semibold text-base">{Number(order.final_price || 0).toLocaleString('uz-UZ')} so'm</div> 
                                                    <div className="text-muted-foreground text-xs">{order.item_count || 'Noma\'lum'} ta mahsulot</div> 
                                                    {/* YANGI: Qayta Buyurtma Berish Tugmasi */}
                                                    {order.status === 'completed' && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="mt-2 text-xs"
                                                            onClick={(e) => {
                                                                e.stopPropagation(); // Cardning o'ziga bosilganda tahrirlashga o'tishni oldini olish
                                                                reorderToSameTable(order);
                                                            }}
                                                        >
                                                            <Repeat className="h-3 w-3 mr-1" /> Qayta Buyurtma
                                                        </Button>
                                                    )}
                                                </div>
                                            </CardContent>
                                            {isEditLoading && editingOrderId === order.id && (
                                                <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
                                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                                </div>
                                            )}
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                    <DialogFooter className="px-6 py-3 border-t">
                        <DialogClose asChild>
                            <Button variant="outline">Yopish</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div> {/* TooltipProvider tugashi */}
    </TooltipProvider>
  )
} // Komponent tugashi