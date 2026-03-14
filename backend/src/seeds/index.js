import mongoose from "mongoose";
import { Product } from "../models/product.model.js";
import { ENV } from "../config/env.js";

const products = [
  // EXISTING 10 (Updated/Cleaned)
  {
    name: "Wireless ANC Headphones Pro",
    description: "Premium over-ear headphones with active noise cancellation, 40-hour battery life, and high-fidelity sound. Perfect for travel and deep focus.",
    price: 249.99, stock: 50, category: "Headphones",
    images: ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500"],
    averageRating: 4.8, totalReviews: 312,
  },
  {
    name: "UltraBook Pro 15",
    description: "A high-performance laptop featuring a 15-inch OLED display, 16GB RAM, and a 1TB SSD. Ideal for creators and power users.",
    price: 1299.99, stock: 20, category: "Laptops",
    images: ["https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500"],
    averageRating: 4.6, totalReviews: 185,
  },
  {
    name: "Galaxy Ultra Smartphone",
    description: "Flagship smartphone with a 108MP camera, all-day battery life, and an immersive 120Hz display.",
    price: 999.99, stock: 35, category: "Smartphones",
    images: ["https://images.unsplash.com/photo-1598327105666-5b89351cb31b?w=500"],
    averageRating: 4.9, totalReviews: 540,
  },
  {
    name: "Bluetooth Portable Speaker",
    description: "Waterproof, rugged bluetooth speaker delivering 360-degree sound. Up to 12 hours of playtime for your outdoor adventures.",
    price: 79.99, stock: 120, category: "Speakers",
    images: ["https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500"],
    averageRating: 4.4, totalReviews: 167,
  },
  {
    name: "Mechanical Gaming Keyboard",
    description: "Tactile mechanical switches with customizable per-key RGB lighting. Built for competitive gamers and typing enthusiasts.",
    price: 119.99, stock: 30, category: "Gaming",
    images: ["https://images.unsplash.com/photo-1595225476474-87563907a212?w=500"],
    averageRating: 4.7, totalReviews: 421,
  },
  {
    name: "4K Action Camera",
    description: "Rugged and waterproof to 33ft. Shoots stunning 4K video with advanced stabilization for extreme sports and vlogging.",
    price: 299.99, stock: 45, category: "Cameras",
    images: ["https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500"],
    averageRating: 4.5, totalReviews: 89,
  },
  {
    name: "Smart Watch Series X",
    description: "Advanced fitness and health tracking, heart rate monitor, GPS, and custom watch faces. Your ultimate digital companion.",
    price: 349.99, stock: 60, category: "Wearables",
    images: ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500"],
    averageRating: 4.7, totalReviews: 256,
  },
  {
    name: "1TB NVMe M.2 SSD",
    description: "Lightning-fast internal solid state drive. Drastically cut load times and boost system responsiveness.",
    price: 89.99, stock: 150, category: "Storage",
    images: ["https://images.unsplash.com/photo-1628557044797-f8f2d4ce1a82?w=500"],
    averageRating: 4.9, totalReviews: 610,
  },
  {
    name: "Wireless Charging Pad",
    description: "Sleek and minimalist 15W fast-charging pad. Compatible with all Qi-enabled smartphones and earbuds.",
    price: 39.99, stock: 200, category: "Accessories",
    images: ["https://images.unsplash.com/photo-1622445270947-32dc2ee7c24f?w=500"],
    averageRating: 4.3, totalReviews: 120,
  },
  {
    name: "Smart Home Hub Controller",
    description: "Voice-activated smart display to control lights, locks, cameras, and thermostats. Keep your whole house connected.",
    price: 149.99, stock: 40, category: "Smart Home",
    images: ["https://images.unsplash.com/photo-1558089687-f282ffcbc126?w=500"],
    averageRating: 4.6, totalReviews: 295,
  },

  // NEW 40 ITEMS
  {
    name: "Pro-Gamer Mouse Z1",
    description: "Ultra-responsive 25k DPI optical sensor, lightweight honeycomb design, and lag-free wireless connection.",
    price: 79.99, stock: 85, category: "Gaming",
    images: ["https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500"],
    averageRating: 4.8, totalReviews: 154,
  },
  {
    name: "CinemaView 32-inch 4K Monitor",
    description: "Stunning 4K color-accurate IPS panel with HDR600 support. Perfect for video editing and immersive gaming.",
    price: 549.99, stock: 15, category: "Monitors",
    images: ["https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500"],
    averageRating: 4.5, totalReviews: 78,
  },
  {
    name: "Core-Tab Pro 11",
    description: "Lightweight 11-inch tablet with a powerful octa-core processor and stylus support for artists and students.",
    price: 499.99, stock: 40, category: "Tablets",
    images: ["https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=500"],
    averageRating: 4.4, totalReviews: 203,
  },
  {
    name: "Studio Master Condenser Mic",
    description: "Professional-grade USB condenser microphone for crystal-clear streaming, podcasting, and vocal recording.",
    price: 129.99, stock: 25, category: "Audio",
    images: ["https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=500"],
    averageRating: 4.7, totalReviews: 112,
  },
  {
    name: "Smart Doorbell Pro",
    description: "2K resolution video doorbell with night vision, AI person detection, and two-way audio.",
    price: 189.99, stock: 35, category: "Smart Home",
    images: ["https://images.unsplash.com/photo-1558002038-1055907df827?w=500"],
    averageRating: 4.3, totalReviews: 86,
  },
  {
    name: "Quantum-X Gaming Desktop",
    description: "Liquid-cooled powerhouse with RTX 5080, 64GB DDR5 RAM, and 4TB NVMe SSD. Peak performance.",
    price: 3499.99, stock: 5, category: "Gaming",
    images: ["https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=500"],
    averageRating: 5.0, totalReviews: 12,
  },
  {
    name: "EcoCharge Solar Power Bank",
    description: "20,000mAh solar-assisted portable charger with rugged casing and built-in LED flashlight.",
    price: 54.99, stock: 110, category: "Accessories",
    images: ["https://images.unsplash.com/photo-1619120238370-ed609f07a73f?w=500"],
    averageRating: 4.1, totalReviews: 94,
  },
  {
    name: "Wi-Fi 7 Mesh System (3-Pack)",
    description: "Next-gen Wi-Fi 7 speeds with whole-home coverage up to 6000 sq ft. Low latency for 8K streaming.",
    price: 699.99, stock: 20, category: "Networking",
    images: ["https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=500"],
    averageRating: 4.9, totalReviews: 45,
  },
  {
    name: "Mini-Cam Vlogger Edition",
    description: "Pocket-sized 4K camera with a flip-screen and external mic input. Designed for creators on the go.",
    price: 449.99, stock: 30, category: "Cameras",
    images: ["https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=500"],
    averageRating: 4.6, totalReviews: 67,
  },
  {
    name: "Premium Leather Laptop Sleeve",
    description: "Handcrafted genuine leather sleeve with soft microfiber lining. Fits most 13-14 inch laptops.",
    price: 45.00, stock: 75, category: "Accessories",
    images: ["https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=500"],
    averageRating: 4.8, totalReviews: 132,
  },
  {
    name: "Focus-Ear Buds v3",
    description: "True wireless earbuds with adaptive spatial audio and industry-leading noise cancellation.",
    price: 179.99, stock: 95, category: "Headphones",
    images: ["https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500"],
    averageRating: 4.7, totalReviews: 428,
  },
  {
    name: "ThinkPad Creator X1",
    description: "The ultimate business laptop with a tactical keyboard, 4K display, and 32GB RAM.",
    price: 1899.00, stock: 12, category: "Laptops",
    images: ["https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=500"],
    averageRating: 4.5, totalReviews: 89,
  },
  {
    name: "Z-Fold Series Smartphone",
    description: "Foldable 7.6-inch AMOLED display, triple camera setup, and multitasking redefined.",
    price: 1599.99, stock: 18, category: "Smartphones",
    images: ["https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=500"],
    averageRating: 4.4, totalReviews: 156,
  },
  {
    name: "Desktop Audio Engine A5+",
    description: "Premium bookshelf speakers with built-in power amps and audiophile-grade components.",
    price: 419.00, stock: 22, category: "Speakers",
    images: ["https://images.unsplash.com/photo-1545454675-3531b543be5d?w=500"],
    averageRating: 4.9, totalReviews: 210,
  },
  {
    name: "Retro-Gaming Console Dock",
    description: "A plug-and-play dock containing 10,000+ classic arcade games with two wireless controllers.",
    price: 99.99, stock: 55, category: "Gaming",
    images: ["https://images.unsplash.com/photo-1592155931584-901ac15763e3?w=500"],
    averageRating: 4.2, totalReviews: 342,
  },
  {
    name: "Full-Frame Mirrorless Camera",
    description: "Pro-level 45MP sensor, 8K video, and lightning-fast autofocus for professional photographers.",
    price: 3299.00, stock: 8, category: "Cameras",
    images: ["https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=500"],
    averageRating: 4.9, totalReviews: 43,
  },
  {
    name: "Health-Track Ring S1",
    description: "Discreet smart ring that monitors sleep, temperature, and activity without a screen.",
    price: 269.99, stock: 45, category: "Wearables",
    images: ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500"],
    averageRating: 4.3, totalReviews: 76,
  },
  {
    name: "Pro-Series 4TB External HDD",
    description: "Ruggedized portable hard drive with 256-bit AES hardware encryption. Dropproof and waterproof.",
    price: 119.99, stock: 140, category: "Storage",
    images: ["https://images.unsplash.com/photo-1531492746076-1a1bd9b29fc0?w=500"],
    averageRating: 4.6, totalReviews: 532,
  },
  {
    name: "USB-C Multiport Adapter 11-in-1",
    description: "Dual 4K HDMI, Gigabit Ethernet, SD card reader, and 100W Power Delivery in one hub.",
    price: 64.99, stock: 160, category: "Accessories",
    images: ["https://images.unsplash.com/photo-1586210579191-33b45e38fa2c?w=500"],
    averageRating: 4.5, totalReviews: 187,
  },
  {
    name: "Smart RGB Floor Lamp",
    description: "Minimalist floor lamp with 16 million colors and voice control via Alexa and Google Home.",
    price: 89.99, stock: 50, category: "Smart Home",
    images: ["https://images.unsplash.com/photo-1534073828943-f801091bb18c?w=500"],
    averageRating: 4.4, totalReviews: 123,
  },
  {
    name: "Gaming Headset Elite Wireless",
    description: "Low-latency 2.4GHz wireless gaming headset with 7.1 surround sound and a broadcast-quality mic.",
    price: 159.99, stock: 40, category: "Gaming",
    images: ["https://images.unsplash.com/photo-1544650039-2287f3299763?w=500"],
    averageRating: 4.7, totalReviews: 289,
  },
  {
    name: "Pro-Display 27-inch 1440p",
    description: "High-refresh 180Hz gaming monitor with 1ms response time and G-Sync compatibility.",
    price: 329.99, stock: 25, category: "Monitors",
    images: ["https://images.unsplash.com/photo-1551645120-d70bfe84c826?w=500"],
    averageRating: 4.8, totalReviews: 112,
  },
  {
    name: "Artist Tablet Pen v4",
    description: "Pressure-sensitive digital pen for graphic design tablets. No charging required.",
    price: 59.99, stock: 90, category: "Accessories",
    images: ["https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=500"],
    averageRating: 4.6, totalReviews: 54,
  },
  {
    name: "Podcast Interface Pro",
    description: "Multi-channel audio interface with integrated sound pads and phantom power for XLR mics.",
    price: 299.99, stock: 15, category: "Audio",
    images: ["https://images.unsplash.com/photo-1598653222000-6b7b7a552625?w=500"],
    averageRating: 4.9, totalReviews: 83,
  },
  {
    name: "Smart Thermostat Pro v2",
    description: "Efficient climate control that learns your preferences, saving energy and money.",
    price: 229.00, stock: 30, category: "Smart Home",
    images: ["https://images.unsplash.com/photo-1567928223614-118fd766863d?w=500"],
    averageRating: 4.5, totalReviews: 214,
  },
  {
    name: "GPU Enthusiast Edition RTX 5090",
    description: "The world's most powerful graphics card for extreme 4K gaming and AI workloads.",
    price: 1999.99, stock: 3, category: "Computer Components",
    images: ["https://images.unsplash.com/photo-1591488320449-011701bb6704?w=500"],
    averageRating: 5.0, totalReviews: 24,
  },
  {
    name: "High-Speed NAS Drive 8TB",
    description: "Reliable 24/7 internal hard drive designed specifically for network-attached storage systems.",
    price: 249.99, stock: 65, category: "Storage",
    images: ["https://images.unsplash.com/photo-1628557044797-f8f2d4ce1a82?w=500"],
    averageRating: 4.7, totalReviews: 134,
  },
  {
    name: "Gigabit Ethernet Switch 16-port",
    description: "Enterprise-grade unmanaged switch for power users and small offices.",
    price: 129.99, stock: 45, category: "Networking",
    images: ["https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=500"],
    averageRating: 4.6, totalReviews: 56,
  },
  {
    name: "Compact Lens 35mm f/1.8",
    description: "Sharp and lightweight prime lens for stunning portraits and street photography.",
    price: 399.00, stock: 20, category: "Cameras",
    images: ["https://images.unsplash.com/photo-1617005814459-83ecbf9bb1a7?w=500"],
    averageRating: 4.8, totalReviews: 91,
  },
  {
    name: "Vertical Ergonomic Mouse",
    description: "Natural 'handshake' position mouse to reduce muscle strain and wrist pressure during long work hours.",
    price: 69.99, stock: 100, category: "Accessories",
    images: ["https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500"],
    averageRating: 4.4, totalReviews: 212,
  },
  {
    name: "Studio Headphones Open-Back",
    description: "Neutral reference headphones with a grand soundstage for music production and mixing.",
    price: 399.00, stock: 30, category: "Headphones",
    images: ["https://images.unsplash.com/photo-1583394838336-acd9921bc338?w=500"],
    averageRating: 4.9, totalReviews: 125,
  },
  {
    name: "Modern Home Office Desk 60-inch",
    description: "Minimalist wooden desk with integrated cable management and built-in wireless charging.",
    price: 499.00, stock: 10, category: "Accessories",
    images: ["https://images.unsplash.com/photo-1518455027359-f3f813b06ad4?w=500"],
    averageRating: 4.5, totalReviews: 42,
  },
  {
    name: "Foldable Phone Case Carbon Fiber",
    description: "Ultra-thin carbon fiber protective case for the latest foldable smartphones.",
    price: 79.99, stock: 150, category: "Accessories",
    images: ["https://images.unsplash.com/photo-1541140532154-b024d715b909?w=500"],
    averageRating: 4.7, totalReviews: 68,
  },
  {
    name: "Multi-Room Wireless Speaker Duo",
    description: "Synchronized dual speaker system for seamless audio throughout your entire apartment.",
    price: 499.00, stock: 25, category: "Speakers",
    images: ["https://images.unsplash.com/photo-1545454675-3531b543be5d?w=500"],
    averageRating: 4.8, totalReviews: 53,
  },
  {
    name: "Gaming Chair Ergonomic Pro",
    description: "Memory foam lumbar support with breathable fabric and 4D adjustable armrests.",
    price: 399.99, stock: 15, category: "Gaming",
    images: ["https://images.unsplash.com/photo-1598550112311-4ef2435992e2?w=500"],
    averageRating: 4.6, totalReviews: 219,
  },
  {
    name: "Travel Drone with 4K HDR",
    description: "Sub-250g drone with a 3-axis gimbal and 30-minute flight time. No registration required in many regions.",
    price: 599.00, stock: 25, category: "Cameras",
    images: ["https://images.unsplash.com/photo-1507582020474-9a35b7d455d9?w=500"],
    averageRating: 4.7, totalReviews: 145,
  },
  {
    name: "Smart Sleep Headband",
    description: "Lightweight sleep mask with integrated speakers and sleep-tracking sensors.",
    price: 129.99, stock: 80, category: "Wearables",
    images: ["https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=500"],
    averageRating: 4.2, totalReviews: 92,
  },
  {
    name: "Internal 2TB SSD Performance",
    description: "Optimized for gaming consoles and high-end PCs with read speeds up to 7,400MB/s.",
    price: 189.99, stock: 120, category: "Storage",
    images: ["https://images.unsplash.com/photo-1590483736622-398541ce1fdd?w=500"],
    averageRating: 4.9, totalReviews: 356,
  },
  {
    name: "Triple-Monitor Desk Mount",
    description: "Heavy-duty gas spring arm mount that supports three 32-inch monitors simultaneously.",
    price: 149.99, stock: 35, category: "Accessories",
    images: ["https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500"],
    averageRating: 4.6, totalReviews: 74,
  },
  {
    name: "Smart Window Blinds Controller",
    description: "Automate your existing window blinds with voice and schedule control.",
    price: 119.00, stock: 40, category: "Smart Home",
    images: ["https://images.unsplash.com/photo-1534073828943-f801091bb18c?w=500"],
    averageRating: 4.3, totalReviews: 48,
  },
  // ADDING 50 MORE (TOTAL 100)
  { name: "8K Ultra-Short Throw Projector", description: "Turn your living room into a cinema with massive 150-inch 8K projection.", price: 2999.99, stock: 5, category: "Monitors", images: ["https://images.unsplash.com/photo-1535016120720-40c646bebbfc?w=500"], averageRating: 4.9, totalReviews: 12 },
  { name: "Pro-Audio Tube Amplifier", description: "Warm, analog sound for vinyl enthusiasts and studio grade audio monitoring.", price: 849.00, stock: 10, category: "Audio", images: ["https://images.unsplash.com/photo-1621528475282-2c2b10322b7d?w=500"], averageRating: 4.8, totalReviews: 34 },
  { name: "VR Pro Headset Bundle", description: "Immersive 5K VR headset with finger-tracking controllers and three base stations.", price: 999.00, stock: 15, category: "Gaming", images: ["https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?w=500"], averageRating: 4.7, totalReviews: 89 },
  { name: "Next-Gen Router Wi-Fi 7 Plus", description: "Multi-gigabit speeds and ultra-low latency for cloud gaming and 8K VR.", price: 449.99, stock: 30, category: "Networking", images: ["https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=500"], averageRating: 4.8, totalReviews: 56 },
  { name: "Smart Air Purifier IoT", description: "HEPA filter with real-time air quality monitoring and smartphone automation.", price: 199.99, stock: 45, category: "Smart Home", images: ["https://images.unsplash.com/photo-1585771724684-252eb9954e2d?w=500"], averageRating: 4.6, totalReviews: 112 },
  { name: "Gaming PC Case (O11 Dynamic)", description: "Premium glass and aluminum case optimized for liquid cooling and RGB builds.", price: 159.00, stock: 25, category: "Computer Components", images: ["https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=500"], averageRating: 4.9, totalReviews: 245 },
  { name: "Mechanical Keyboard (Custom 60%)", description: "Hot-swappable switches with premium PBT keycaps and aluminum chassis.", price: 139.99, stock: 40, category: "Gaming", images: ["https://images.unsplash.com/photo-1595225476474-87563907a212?w=500"], averageRating: 4.7, totalReviews: 87 },
  { name: "Full-Motion TV Wall Mount", description: "Heavy-duty articulating mount for OLED and LED TVs up to 85 inches.", price: 89.00, stock: 60, category: "Accessories", images: ["https://images.unsplash.com/photo-1593359677777-a39937baf6aa?w=500"], averageRating: 4.5, totalReviews: 154 },
  { name: "Smart Garden IoT Base", description: "Automated indoor garden with LED growth lights and water-level notifications.", price: 149.00, stock: 20, category: "Smart Home", images: ["https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=500"], averageRating: 4.4, totalReviews: 67 },
  { name: "Professional Studio Monitor Headphones", description: "Flat response over-ear headphones for critical listening and sound design.", price: 199.00, stock: 35, category: "Audio", images: ["https://images.unsplash.com/photo-1546435770-a3e426cd473b?w=500"], averageRating: 4.9, totalReviews: 213 },
  { name: "Wireless Mechanical Mouse S2", description: "Ergonomic wireless mouse with silent clicks and high-precision sensor.", price: 54.99, stock: 120, category: "Accessories", images: ["https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500"], averageRating: 4.3, totalReviews: 432 },
  { name: "Gaming Laptop (RTX 4070)", description: "144Hz screen with dedicated graphics for smooth mobile gaming performance.", price: 1349.00, stock: 12, category: "Laptops", images: ["https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=500"], averageRating: 4.6, totalReviews: 78 },
  { name: "Pro Camera Gimbal Stabilizer", description: "3-axis handheld stabilizer for professional mirrorless and DSLR cameras.", price: 399.00, stock: 18, category: "Cameras", images: ["https://images.unsplash.com/photo-1581591524425-c7e0978865fc?w=500"], averageRating: 4.7, totalReviews: 54 },
  { name: "Smart Water Leak Sensor (3-Pack)", description: "Detect leaks early and get notified on your phone before damage happens.", price: 79.99, stock: 55, category: "Smart Home", images: ["https://images.unsplash.com/photo-1558002038-1055907df827?w=500"], averageRating: 4.2, totalReviews: 89 },
  { name: "External Blue-ray Drive Pro", description: "USB 3.0 portable drive for watching movies and archiving high-capacity data.", price: 69.00, stock: 40, category: "Storage", images: ["https://images.unsplash.com/photo-1590483736622-398541ce1fdd?w=500"], averageRating: 4.1, totalReviews: 65 },
  { name: "Carbon Fiber Hybrid Bike Computer", description: "GPS mapping, heart rate tracking, and cadence sensors for serious cyclists.", price: 299.99, stock: 25, category: "Wearables", images: ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500"], averageRating: 4.8, totalReviews: 142 },
  { name: "Pro 4K USB Webcam (60FPS)", description: "High-definition streaming camera with auto-framing and dual stereo mics.", price: 159.00, stock: 75, category: "Accessories", images: ["https://images.unsplash.com/photo-1510511459019-5dee99c47f4d?w=500"], averageRating: 4.5, totalReviews: 167 },
  { name: "Desktop Microphone Arm", description: "Floating boom arm with internal springs for professional streaming setups.", price: 49.99, stock: 95, category: "Accessories", images: ["https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=500"], averageRating: 4.6, totalReviews: 245 },
  { name: "Wi-Fi Smart Plug (4-Pack)", description: "Control any outlet from your phone or voice assistant with schedules.", price: 34.00, stock: 180, category: "Smart Home", images: ["https://images.unsplash.com/photo-1558002038-1055907df827?w=500"], averageRating: 4.7, totalReviews: 543 },
  { name: "Gaming Desk Mat (XL RGB)", description: "Waterproof micro-fiber surface with customizable edge-lit lighting.", price: 29.99, stock: 200, category: "Accessories", images: ["https://images.unsplash.com/photo-1616627561950-9f746caf99bc?w=500"], averageRating: 4.8, totalReviews: 124 },
  { name: "Studio Reference Subwoofer", description: "Deep, accurate bass for studio monitoring and home theater setups.", price: 499.00, stock: 10, category: "Audio", images: ["https://images.unsplash.com/photo-1545454675-3531b543be5d?w=500"], averageRating: 4.9, totalReviews: 67 },
  { name: "Smart Mirror with Display", description: "Interactive bathroom mirror with morning headlines and weather info.", price: 349.00, stock: 8, category: "Smart Home", images: ["https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=500"], averageRating: 4.3, totalReviews: 23 },
  { name: "Laptop Docking Station (Triple Display)", description: "Power your workstation with 13-in-1 ports over a single Thunderbolt cable.", price: 189.99, stock: 30, category: "Accessories", images: ["https://images.unsplash.com/photo-1586210579191-33b45e38fa2c?w=500"], averageRating: 4.7, totalReviews: 156 },
  { name: "Retro Vinyl Player Bluetooth", description: "Vintage wooden turntable with modern Bluetooth input and line output.", price: 129.99, stock: 45, category: "Audio", images: ["https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=500"], averageRating: 4.5, totalReviews: 322 },
  { name: "Digital Photo Frame Pro", description: "10.1-inch Wi-Fi frame for sharing photos directly from your phone.", price: 119.00, stock: 65, category: "Smart Home", images: ["https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500"], averageRating: 4.4, totalReviews: 187 },
  { name: "Gaming Headset Stand (RGB)", description: "Dual USB ports and integrated cable routing for your desktop setup.", price: 39.99, stock: 140, category: "Accessories", images: ["https://images.unsplash.com/photo-1544650039-2287f3299763?w=500"], averageRating: 4.7, totalReviews: 94 },
  { name: "Pro SSD Enclosure (M.2 NVMe)", description: "High-speed 10Gbps pocket enclosure for cloning or portable storage.", price: 29.99, stock: 150, category: "Storage", images: ["https://images.unsplash.com/photo-1590483736622-398541ce1fdd?w=500"], averageRating: 4.3, totalReviews: 212 },
  { name: "Smart Pet Camera with Treat Tosser", description: "Check on your pet and feed them treats remotely via the app.", price: 159.00, stock: 22, category: "Smart Home", images: ["https://images.unsplash.com/photo-1558089687-f282ffcbc126?w=500"], averageRating: 4.6, totalReviews: 86 },
  { name: "Noise-Isolating Earbuds (Wired Pro)", description: "In-ear monitors with detachable cables for musicians and producers.", price: 79.99, stock: 85, category: "Audio", images: ["https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500"], averageRating: 4.7, totalReviews: 134 },
  { name: "Desk Power Strip with PD USB-C", description: "Clamps to your desk with fast-charging ports for all your devices.", price: 44.00, stock: 110, category: "Accessories", images: ["https://images.unsplash.com/photo-1586210579191-33b45e38fa2c?w=500"], averageRating: 4.5, totalReviews: 76 },
  { name: "Camera Cleaning Kit Pro", description: "Essential tools for maintaining high-end lenses and camera sensors.", price: 19.99, stock: 200, category: "Accessories", images: ["https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=500"], averageRating: 4.9, totalReviews: 312 },
  { name: "Smart Lock Wi-Fi Gateway", description: "Remote control for your deadbolt with real-time access logs.", price: 199.00, stock: 15, category: "Smart Home", images: ["https://images.unsplash.com/photo-1558002038-1055907df827?w=500"], averageRating: 4.4, totalReviews: 54 },
  { name: "Portable SSD 2TB (Rugged)", description: "Encryption and drop protection for professional creators in the field.", price: 179.99, stock: 60, category: "Storage", images: ["https://images.unsplash.com/photo-1628557044797-f8f2d4ce1a82?w=500"], averageRating: 4.8, totalReviews: 112 },
  { name: "Smart Bird Feeder with AI Camera", description: "Identify birds as they visit and capture high-res photos automatically.", price: 229.00, stock: 12, category: "Smart Home", images: ["https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=500"], averageRating: 4.7, totalReviews: 34 },
  { name: "Laptop Cooler Pad (RGB Fans)", description: "Ergonomic stand with six silent fans to prevent thermal throttling.", price: 34.99, stock: 140, category: "Accessories", images: ["https://images.unsplash.com/photo-1541140532154-b024d715b909?w=500"], averageRating: 4.2, totalReviews: 245 },
  { name: "Smart Coffee Maker (App Enabled)", description: "Schedule your brew and customize strength from your smartphone.", price: 149.00, stock: 20, category: "Smart Home", images: ["https://images.unsplash.com/photo-1558089687-f282ffcbc126?w=500"], averageRating: 4.5, totalReviews: 112 },
  { name: "Gaming Steering Wheel Set", description: "Full force-feedback wheel with metal pedals for racing simulators.", price: 349.99, stock: 8, category: "Gaming", images: ["https://images.unsplash.com/photo-1592155931584-901ac15763e3?w=500"], averageRating: 4.9, totalReviews: 124 },
  { name: "Pro Camera Backpack (Waterproof)", description: "Dedicated compartments for two bodies, five lenses, and a drone.", price: 129.00, stock: 35, category: "Accessories", images: ["https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=500"], averageRating: 4.8, totalReviews: 87 },
  { name: "Smart Curtains Automation Kit", description: "Automate your existing curtains with voice and sensor triggers.", price: 159.00, stock: 15, category: "Smart Home", images: ["https://images.unsplash.com/photo-1534073828943-f801091bb18c?w=500"], averageRating: 4.3, totalReviews: 23 },
  { name: "Desktop RGB Light Bars (Pair)", description: "Synchronize your desktop lighting with your music and games.", price: 69.99, stock: 50, category: "Gaming", images: ["https://images.unsplash.com/photo-1534073763261-34860492e850?w=500"], averageRating: 4.6, totalReviews: 154 },
  { name: "External Sound Card DAC", description: "High-resolution audio output for premium wired headphones.", price: 89.00, stock: 40, category: "Audio", images: ["https://images.unsplash.com/photo-1598653222000-6b7b7a552625?w=500"], averageRating: 4.7, totalReviews: 89 },
  { name: "Smart Scale IoT (Body Fat Pro)", description: "Advanced body composition tracking with automated data syncing.", price: 59.99, stock: 95, category: "Wearables", images: ["https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=500"], averageRating: 4.4, totalReviews: 543 },
  { name: "Gaming Keycaps Set (Custom Artisan)", description: "Handcrafted resin keycaps for mechanical keyboard enthusiasts.", price: 45.00, stock: 200, category: "Accessories", images: ["https://images.unsplash.com/photo-1595225476474-87563907a212?w=500"], averageRating: 4.9, totalReviews: 124 },
  { name: "Pro Studio Boom Arm Plus", description: "Silent, heavy-duty arm for professional broadcast microphones.", price: 89.00, stock: 30, category: "Accessories", images: ["https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=500"], averageRating: 4.8, totalReviews: 76 },
  { name: "Smart Air Quality Monitor (PM2.5)", description: "Real-time tracking of fine dust, VOCs, and humidity in your home.", price: 99.00, stock: 40, category: "Smart Home", images: ["https://images.unsplash.com/photo-1585771724684-252eb9954e2d?w=500"], averageRating: 4.5, totalReviews: 112 },
  { name: "Internal 4TB HDD (Bulk Storage)", description: "High-capacity storage for media servers and long-term archiving.", price: 99.99, stock: 110, category: "Storage", images: ["https://images.unsplash.com/photo-1531492746076-1a1bd9b29fc0?w=500"], averageRating: 4.6, totalReviews: 322 },
  { name: "USB-C Multi-Fast Charger (140W)", description: "Powerful GaN wall charger for laptops and phones simultaneously.", price: 79.00, stock: 150, category: "Accessories", images: ["https://images.unsplash.com/photo-1622445270947-32dc2ee7c24f?w=500"], averageRating: 4.8, totalReviews: 87 },
  { name: "Pro Video Lights Desk Set", description: "Dimmable LED panels for flattering lighting on video calls.", price: 119.99, stock: 35, category: "Accessories", images: ["https://images.unsplash.com/photo-1510511459019-5dee99c47f4d?w=500"], averageRating: 4.7, totalReviews: 54 },
  { name: "Smart Pet Water Fountain IoT", description: "filtered water fountain with hydration alerts for your pets.", price: 49.00, stock: 65, category: "Smart Home", images: ["https://images.unsplash.com/photo-1558089687-f282ffcbc126?w=500"], averageRating: 4.4, totalReviews: 187 },
  { name: "Vertical Monitor Stand Pro", description: "Optimize your desk space with a heavy-duty vertical screen mount.", price: 39.00, stock: 100, category: "Accessories", images: ["https://images.unsplash.com/photo-1551645120-d70bfe84c826?w=500"], averageRating: 4.5, totalReviews: 76 },
];

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(ENV.DB_URL);
    console.log("✅ Connected to MongoDB");

    // Clear existing products
    await Product.deleteMany({});
    console.log("🗑️  Cleared existing products");

    // Insert seed products
    await Product.insertMany(products);
    console.log(`✅ Successfully seeded ${products.length} products`);

    // Display summary
    const categories = [...new Set(products.map((p) => p.category))];
    console.log("\n📊 Seeded Products Summary:");
    console.log(`Total Products: ${products.length}`);
    console.log(`Categories: ${categories.join(", ")}`);

    // Close connection
    await mongoose.connection.close();
    console.log("\n✅ Database seeding completed and connection closed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
};

// Run the seed function
seedDatabase();