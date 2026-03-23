import mongoose from "mongoose";
import { Product } from "../models/product.model.js";
import { ENV } from "../config/env.js";

const catalog = {
  Smartphones: [
    {
      name: "Apple iPhone 16",
      description: "Premium smartphone with powerful performance, advanced camera system, and sleek modern design.",
      price: 219000,
      imageUrl: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80"
    },
    {
      name: "Apple iPhone 16 Plus",
      description: "Large-screen smartphone with strong battery life, premium build quality, and smooth everyday performance.",
      price: 279000,
      imageUrl: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&q=80"
    },
    {
      name: "Samsung Galaxy S25",
      description: "Flagship Android phone with bright display, reliable cameras, and refined software experience.",
      price: 249000,
      imageUrl: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&q=80"
    },
    {
      name: "Samsung Galaxy S25 Ultra",
      description: "High-end smartphone with premium camera features, large display, and top-tier flagship performance.",
      price: 399000,
      imageUrl: "https://images.unsplash.com/photo-1580910051074-3eb694886505?w=800&q=80"
    },
    {
      name: "Google Pixel 9",
      description: "Clean Android smartphone with excellent camera quality and smooth software optimization.",
      price: 249000,
      imageUrl: "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800&q=80"
    },
    {
      name: "Google Pixel 9 Pro",
      description: "Premium Pixel phone with advanced photography tools, flagship features, and elegant design.",
      price: 319000,
      imageUrl: "https://images.unsplash.com/photo-1603899122634-f086ca5f5ddd?w=800&q=80"
    },
    {
      name: "OnePlus 13",
      description: "Fast and smooth Android flagship offering premium hardware and responsive user experience.",
      price: 289000,
      imageUrl: "https://images.unsplash.com/photo-1567581935884-3349723552ca?w=800&q=80"
    },
    {
      name: "Xiaomi 15",
      description: "Stylish flagship smartphone with strong value, modern design, and reliable daily performance.",
      price: 235000,
      imageUrl: "https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=800&q=80"
    },
    {
      name: "Nothing Phone (3)",
      description: "Unique design-focused smartphone with clean interface and balanced mid-to-premium performance.",
      price: 219000,
      imageUrl: "https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?w=800&q=80"
    },
    {
      name: "Motorola Edge 50 Ultra",
      description: "Premium Motorola smartphone with refined design, strong display quality, and versatile cameras.",
      price: 259000,
      imageUrl: "https://images.unsplash.com/photo-1598327105666-5b89351cb31b?w=800&q=80"
    }
  ],

  Laptops: [
    {
      name: "Dell XPS 13",
      description: "Compact premium laptop with sharp display, lightweight body, and strong productivity performance.",
      price: 319000,
      imageUrl: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80"
    },
    {
      name: "MacBook Air 13 M4",
      description: "Slim and efficient laptop with excellent battery life and smooth performance for daily use.",
      price: 349000,
      imageUrl: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80"
    },
    {
      name: "MacBook Pro 14 M4",
      description: "Professional-grade laptop built for demanding creative work, coding, and multitasking.",
      price: 559000,
      imageUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80"
    },
    {
      name: "HP Spectre x360 14",
      description: "Convertible premium laptop with touchscreen flexibility and elegant high-end design.",
      price: 429000,
      imageUrl: "https://images.unsplash.com/photo-1516387938699-a93567ec168e?w=800&q=80"
    },
    {
      name: "Lenovo Yoga 9i",
      description: "Versatile 2-in-1 laptop with premium build, smooth performance, and flexible usage modes.",
      price: 449000,
      imageUrl: "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800&q=80"
    },
    {
      name: "ASUS Zenbook 14 OLED",
      description: "Portable laptop with vivid OLED screen, lightweight design, and solid all-round productivity.",
      price: 379000,
      imageUrl: "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800&q=80"
    },
    {
      name: "Acer Swift X 14",
      description: "Modern laptop designed for creators needing strong performance in a portable form.",
      price: 399000,
      imageUrl: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80"
    },
    {
      name: "Microsoft Surface Laptop 7",
      description: "Clean, lightweight laptop with premium feel, sharp display, and smooth daily performance.",
      price: 339000,
      imageUrl: "https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?w=800&q=80"
    },
    {
      name: "Samsung Galaxy Book4 Pro",
      description: "Thin premium laptop with AMOLED display and reliable productivity-focused performance.",
      price: 429000,
      imageUrl: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=800&q=80"
    },
    {
      name: "Razer Blade 14",
      description: "High-performance gaming and creator laptop with premium build and powerful internals.",
      price: 699000,
      imageUrl: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&q=80"
    }
  ],

  Tablets: [
    {
      name: "Apple iPad 10th Gen",
      description: "Reliable everyday tablet for study, browsing, entertainment, and general productivity.",
      price: 119000,
      imageUrl: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&q=80"
    },
    {
      name: "Apple iPad Air 11",
      description: "Thin and powerful tablet with premium design for work, creativity, and media.",
      price: 219000,
      imageUrl: "https://images.unsplash.com/photo-1561154464-82e9adf32764?w=800&q=80"
    },
    {
      name: "Apple iPad Pro 11",
      description: "Professional tablet with powerful hardware, sharp display, and advanced performance.",
      price: 329000,
      imageUrl: "https://images.unsplash.com/photo-1585790050230-5dd28404ccb9?w=800&q=80"
    },
    {
      name: "Samsung Galaxy Tab S10",
      description: "Premium Android tablet with vivid display and excellent multitasking features.",
      price: 209000,
      imageUrl: "https://images.unsplash.com/photo-1587033411391-5d9e51cce126?w=800&q=80"
    },
    {
      name: "Samsung Galaxy Tab S10 Ultra",
      description: "Large flagship tablet ideal for productivity, entertainment, and creative work.",
      price: 389000,
      imageUrl: "https://images.unsplash.com/photo-1623126908029-58cb08a2b272?w=800&q=80"
    },
    {
      name: "Xiaomi Pad 7",
      description: "Value-focused tablet with sleek design and smooth performance for media and work.",
      price: 129000,
      imageUrl: "https://images.unsplash.com/photo-1546054454-aa26e2b734c7?w=800&q=80"
    },
    {
      name: "Lenovo Tab P12",
      description: "Large-screen Android tablet suitable for study, streaming, and productivity tasks.",
      price: 109000,
      imageUrl: "https://images.unsplash.com/photo-1589739900243-4b52cd9dd1f3?w=800&q=80"
    },
    {
      name: "Microsoft Surface Pro 11",
      description: "Tablet-laptop hybrid designed for premium portable productivity and professional work.",
      price: 459000,
      imageUrl: "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?w=800&q=80"
    },
    {
      name: "OnePlus Pad 2",
      description: "Modern Android tablet with smooth display and strong day-to-day usability.",
      price: 169000,
      imageUrl: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800&q=80"
    },
    {
      name: "Huawei MatePad 11.5",
      description: "Stylish tablet focused on entertainment, note-taking, and productivity convenience.",
      price: 139000,
      imageUrl: "https://images.unsplash.com/photo-1563770660941-10a63607692e?w=800&q=80"
    }
  ],

  Audio: [
    {
      name: "Sony ULT Wear",
      description: "Comfortable premium wireless audio gear with strong bass and modern styling.",
      price: 69000,
      imageUrl: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&q=80"
    },
    {
      name: "Bose QuietComfort",
      description: "Well-balanced premium audio device with comfort-focused design and clear sound.",
      price: 99000,
      imageUrl: "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&q=80"
    },
    {
      name: "JBL Live 770NC",
      description: "Wireless audio product with punchy sound and strong casual listening value.",
      price: 59000,
      imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80"
    },
    {
      name: "Anker Soundcore Q45",
      description: "Value-driven audio device with modern features and strong battery performance.",
      price: 39000,
      imageUrl: "https://images.unsplash.com/photo-1487215078519-e21cc028cb29?w=800&q=80"
    },
    {
      name: "Sennheiser Accentum",
      description: "Premium audio solution delivering clean sound and solid all-day comfort.",
      price: 79000,
      imageUrl: "https://images.unsplash.com/photo-1558756520-22cfe5d13d70?w=800&q=80"
    },
    {
      name: "Marshall Major V",
      description: "Stylish audio gear with signature look, portable form, and enjoyable sound.",
      price: 65000,
      imageUrl: "https://images.unsplash.com/photo-1507878866276-a947ef722fee?w=800&q=80"
    },
    {
      name: "Skullcandy Crusher Evo",
      description: "Bass-heavy audio option built for energetic listening and bold design lovers.",
      price: 49000,
      imageUrl: "https://images.unsplash.com/photo-1577174881658-0f30ed549adc?w=800&q=80"
    },
    {
      name: "Beats Solo 4",
      description: "Portable lifestyle audio device with recognizable style and smooth wireless use.",
      price: 85000,
      imageUrl: "https://images.unsplash.com/photo-1545127398-14699f92334b?w=800&q=80"
    },
    {
      name: "Sony WF-1000XM5",
      description: "Premium compact audio product with excellent clarity and everyday convenience.",
      price: 89000,
      imageUrl: "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=800&q=80"
    },
    {
      name: "Jabra Elite 10",
      description: "High-quality wireless audio with comfort-focused design and premium feature set.",
      price: 79000,
      imageUrl: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800&q=80"
    }
  ],

  Headphones: [
    {
      name: "Sony WH-1000XM6",
      description: "Top-tier noise-cancelling headphones with premium comfort and excellent sound quality.",
      price: 125000,
      imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80"
    },
    {
      name: "Apple AirPods Max",
      description: "Premium over-ear headphones with refined design and immersive listening experience.",
      price: 199000,
      imageUrl: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&q=80"
    },
    {
      name: "Bose QuietComfort Ultra",
      description: "Comfort-focused premium headphones with rich sound and strong noise reduction.",
      price: 139000,
      imageUrl: "https://images.unsplash.com/photo-1487215078519-e21cc028cb29?w=800&q=80"
    },
    {
      name: "Sennheiser Momentum 4",
      description: "Elegant wireless headphones with balanced audio tuning and long battery life.",
      price: 119000,
      imageUrl: "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&q=80"
    },
    {
      name: "JBL Tour One M2",
      description: "Feature-rich wireless headphones built for travel, music, and daily use.",
      price: 99000,
      imageUrl: "https://images.unsplash.com/photo-1558756520-22cfe5d13d70?w=800&q=80"
    },
    {
      name: "Anker Soundcore Space One",
      description: "Affordable wireless headphones delivering strong value and modern comfort.",
      price: 29000,
      imageUrl: "https://images.unsplash.com/photo-1577174881658-0f30ed549adc?w=800&q=80"
    },
    {
      name: "Beats Studio Pro",
      description: "Stylish premium headphones with bold design and energetic sound signature.",
      price: 99000,
      imageUrl: "https://images.unsplash.com/photo-1545127398-14699f92334b?w=800&q=80"
    },
    {
      name: "Marshall Monitor II",
      description: "Distinctive headphones with iconic styling and enjoyable wireless performance.",
      price: 95000,
      imageUrl: "https://images.unsplash.com/photo-1507878866276-a947ef722fee?w=800&q=80"
    },
    {
      name: "Skullcandy Hesh ANC",
      description: "Casual wireless headphones with comfortable fit and strong everyday usability.",
      price: 35000,
      imageUrl: "https://images.unsplash.com/photo-1532634896-26909d0d4b6b?w=800&q=80"
    },
    {
      name: "Logitech Zone Wireless 2",
      description: "Professional wireless headset built for office calls, music, and comfort.",
      price: 89000,
      imageUrl: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800&q=80"
    }
  ],

  Speakers: [
    {
      name: "JBL Flip 7",
      description: "Portable Bluetooth speaker with punchy sound and durable travel-friendly design.",
      price: 39000,
      imageUrl: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&q=80"
    },
    {
      name: "JBL Charge 6",
      description: "Powerful portable speaker with stronger bass and long-lasting battery life.",
      price: 59000,
      imageUrl: "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&q=80"
    },
    {
      name: "Sony SRS-XG300",
      description: "Portable speaker designed for energetic sound, durability, and outdoor use.",
      price: 79000,
      imageUrl: "https://images.unsplash.com/photo-1589003077984-894e133dabab?w=800&q=80"
    },
    {
      name: "Bose SoundLink Flex",
      description: "Compact premium speaker with clean sound and easy carry convenience.",
      price: 59000,
      imageUrl: "https://images.unsplash.com/photo-1512446816042-444d64126727?w=800&q=80"
    },
    {
      name: "Marshall Emberton II",
      description: "Stylish portable speaker with iconic design and bold wireless playback.",
      price: 69000,
      imageUrl: "https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=800&q=80"
    },
    {
      name: "Anker Soundcore Motion X600",
      description: "Feature-packed wireless speaker offering strong value and immersive sound.",
      price: 49000,
      imageUrl: "https://images.unsplash.com/photo-1542556398-95fb5b9f9b3b?w=800&q=80"
    },
    {
      name: "Ultimate Ears Boom 4",
      description: "Rugged cylindrical speaker made for outdoor listening and casual portability.",
      price: 65000,
      imageUrl: "https://images.unsplash.com/photo-1493676304819-0d7a8d026dcf?w=800&q=80"
    },
    {
      name: "Harman Kardon Onyx Studio 9",
      description: "Premium home speaker with elegant design and room-filling sound output.",
      price: 99000,
      imageUrl: "https://images.unsplash.com/photo-1519666213635-f99a0c83d7b2?w=800&q=80"
    },
    {
      name: "Tribit StormBox Blast",
      description: "Loud portable speaker built for parties, outdoor use, and bass-heavy playback.",
      price: 55000,
      imageUrl: "https://images.unsplash.com/photo-1507874457470-272b3c8d8ee2?w=800&q=80"
    },
    {
      name: "LG XBOOM Go XG8",
      description: "Portable Bluetooth speaker with bold sound and strong battery life.",
      price: 45000,
      imageUrl: "https://images.unsplash.com/photo-1524678606370-a47ad25cb82a?w=800&q=80"
    }
  ],

  Gaming: [
    {
      name: "PlayStation 5 Slim",
      description: "Modern gaming console delivering strong performance and premium gaming experience.",
      price: 219000,
      imageUrl: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800&q=80"
    },
    {
      name: "PlayStation 5 Pro",
      description: "High-end console designed for improved visual performance and demanding games.",
      price: 319000,
      imageUrl: "https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=800&q=80"
    },
    {
      name: "Xbox Series X",
      description: "Powerful gaming console focused on smooth performance and strong game library.",
      price: 239000,
      imageUrl: "https://images.unsplash.com/photo-1622297845775-5ff3fef71d13?w=800&q=80"
    },
    {
      name: "Xbox Series S",
      description: "Compact digital gaming console offering good value and modern performance.",
      price: 159000,
      imageUrl: "https://images.unsplash.com/photo-1605901309584-818e25960a8f?w=800&q=80"
    },
    {
      name: "Nintendo Switch OLED",
      description: "Flexible hybrid console with vibrant screen and strong portable gaming appeal.",
      price: 139000,
      imageUrl: "https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=800&q=80"
    },
    {
      name: "Nintendo Switch Lite",
      description: "Compact handheld gaming console suited for portable casual gaming sessions.",
      price: 89000,
      imageUrl: "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=800&q=80"
    },
    {
      name: "Steam Deck OLED",
      description: "Portable PC gaming device built for handheld performance and flexible gaming.",
      price: 229000,
      imageUrl: "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=800&q=80"
    },
    {
      name: "ASUS ROG Ally X",
      description: "Powerful handheld gaming system designed for modern PC gaming on the go.",
      price: 299000,
      imageUrl: "https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=800&q=80"
    },
    {
      name: "Lenovo Legion Go",
      description: "Large-screen handheld gaming device with premium features and strong portability.",
      price: 289000,
      imageUrl: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&q=80"
    },
    {
      name: "Logitech G Cloud",
      description: "Cloud-focused handheld gaming device designed for comfortable extended sessions.",
      price: 149000,
      imageUrl: "https://images.unsplash.com/photo-1486572788966-cfd3df1f5b42?w=800&q=80"
    }
  ],

  Accessories: [
    {
      name: "Apple MagSafe Charger",
      description: "Convenient magnetic wireless charger designed for compatible premium smartphones.",
      price: 19000,
      imageUrl: "https://images.unsplash.com/photo-1585338447937-7082f8fc763d?w=800&q=80"
    },
    {
      name: "Anker 737 Power Bank",
      description: "High-capacity fast-charging power bank suited for travel and heavy daily use.",
      price: 35000,
      imageUrl: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=800&q=80"
    },
    {
      name: "Samsung 45W Fast Charger",
      description: "Reliable fast charger built for quick power delivery and safe charging.",
      price: 12000,
      imageUrl: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&q=80"
    },
    {
      name: "UGREEN USB-C Hub",
      description: "Compact connectivity hub expanding laptop ports for productivity and convenience.",
      price: 14500,
      imageUrl: "https://images.unsplash.com/photo-1625948515291-69613efd103f?w=800&q=80"
    },
    {
      name: "Logitech Brio 4K Webcam",
      description: "High-quality webcam designed for professional video meetings and streaming.",
      price: 49000,
      imageUrl: "https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=800&q=80"
    },
    {
      name: "Belkin 3-in-1 Wireless Charger",
      description: "Premium charging dock built for convenient multi-device desk setup.",
      price: 39000,
      imageUrl: "https://images.unsplash.com/photo-1609592424824-7bd4dd22d3aa?w=800&q=80"
    },
    {
      name: "Spigen Rugged Armor Case",
      description: "Protective device case with durable build and slim everyday form factor.",
      price: 8500,
      imageUrl: "https://images.unsplash.com/photo-1601593346740-925612772716?w=800&q=80"
    },
    {
      name: "Apple USB-C to USB Adapter",
      description: "Compact adapter for connecting classic USB accessories to modern devices.",
      price: 9500,
      imageUrl: "https://images.unsplash.com/photo-1625723044792-44de16ccb4e7?w=800&q=80"
    },
    {
      name: "Baseus Laptop Stand",
      description: "Ergonomic aluminum stand improving desk comfort and airflow for laptops.",
      price: 11500,
      imageUrl: "https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=800&q=80"
    },
    {
      name: "SanDisk Ultra Dual Drive",
      description: "Compact storage accessory ideal for quick transfers between modern devices.",
      price: 9900,
      imageUrl: "https://images.unsplash.com/photo-1587033411391-5d9e51cce126?w=800&q=80"
    }
  ],

  "Smart Home": [
    {
      name: "Google Nest Hub 2nd Gen",
      description: "Smart display for home control, media playback, and everyday convenience.",
      price: 45000,
      imageUrl: "https://images.unsplash.com/photo-1558089687-f282ffcbc126?w=800&q=80"
    },
    {
      name: "Amazon Echo Dot 5th Gen",
      description: "Compact smart speaker with voice assistant features and home control support.",
      price: 22000,
      imageUrl: "https://images.unsplash.com/photo-1518444065439-e933c06ce9cd?w=800&q=80"
    },
    {
      name: "Google Nest Audio",
      description: "Smart speaker offering better room audio and voice-based smart features.",
      price: 34000,
      imageUrl: "https://images.unsplash.com/photo-1543512214-318c7553f230?w=800&q=80"
    },
    {
      name: "TP-Link Tapo C210",
      description: "Indoor smart security camera with mobile monitoring and easy setup.",
      price: 16500,
      imageUrl: "https://images.unsplash.com/photo-1558002038-1055907df827?w=800&q=80"
    },
    {
      name: "Xiaomi Smart Air Purifier 4",
      description: "Modern air purifier with app controls and clean minimal design.",
      price: 69000,
      imageUrl: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&q=80"
    },
    {
      name: "Philips Hue Starter Kit",
      description: "Smart lighting setup for customizable home ambience and app-based control.",
      price: 59000,
      imageUrl: "https://images.unsplash.com/photo-1558002038-1055907df827?w=800&q=80"
    },
    {
      name: "Ring Video Doorbell",
      description: "Smart door security device offering mobile alerts and visitor visibility.",
      price: 49000,
      imageUrl: "https://images.unsplash.com/photo-1558002038-1055907df827?w=800&q=80"
    },
    {
      name: "SwitchBot Curtain 3",
      description: "Smart home automation device built to upgrade curtains with remote control.",
      price: 27000,
      imageUrl: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80"
    },
    {
      name: "Eufy RoboVac G30",
      description: "Robot vacuum cleaner designed for convenient automated floor cleaning.",
      price: 79000,
      imageUrl: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&q=80"
    },
    {
      name: "Aqara Smart Lock U100",
      description: "Modern smart lock with app access, home automation, and security features.",
      price: 95000,
      imageUrl: "https://images.unsplash.com/photo-1558002038-1055907df827?w=800&q=80"
    }
  ],

  Wearables: [
    {
      name: "Apple Watch Series 10",
      description: "Premium smartwatch offering health tracking, notifications, and polished design.",
      price: 149000,
      imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80"
    },
    {
      name: "Apple Watch Ultra 2",
      description: "Rugged high-end smartwatch built for fitness, adventure, and premium performance.",
      price: 299000,
      imageUrl: "https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=800&q=80"
    },
    {
      name: "Samsung Galaxy Watch 7",
      description: "Modern smartwatch with health tools, notifications, and sleek wearable design.",
      price: 89000,
      imageUrl: "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&q=80"
    },
    {
      name: "Samsung Galaxy Watch Ultra",
      description: "Premium Samsung wearable designed for advanced activity and lifestyle tracking.",
      price: 159000,
      imageUrl: "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&q=80"
    },
    {
      name: "Google Pixel Watch 3",
      description: "Elegant smartwatch combining Google services with modern wearable convenience.",
      price: 115000,
      imageUrl: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&q=80"
    },
    {
      name: "Garmin Venu 3",
      description: "Fitness-focused smartwatch with advanced health metrics and premium comfort.",
      price: 165000,
      imageUrl: "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&q=80"
    },
    {
      name: "Huawei Watch GT 5",
      description: "Stylish smartwatch offering long battery life and practical daily health tracking.",
      price: 79000,
      imageUrl: "https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?w=800&q=80"
    },
    {
      name: "Amazfit Balance",
      description: "Affordable smartwatch with solid health features and lightweight comfortable design.",
      price: 59000,
      imageUrl: "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=800&q=80"
    },
    {
      name: "OnePlus Watch 3",
      description: "Smart wearable with premium build, smooth software, and daily convenience features.",
      price: 69000,
      imageUrl: "https://images.unsplash.com/photo-1617043786394-f977fa12eddf?w=800&q=80"
    },
    {
      name: "Fitbit Sense 2",
      description: "Health-focused smartwatch designed for wellness tracking and lifestyle monitoring.",
      price: 85000,
      imageUrl: "https://images.unsplash.com/photo-1544117519-31a4b719223d?w=800&q=80"
    }
  ],

  Cameras: [
    {
      name: "Canon EOS R50",
      description: "Compact mirrorless camera built for content creation and everyday photography.",
      price: 289000,
      imageUrl: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80"
    },
    {
      name: "Canon EOS R6 Mark II",
      description: "Advanced full-frame camera for professional photo and video production.",
      price: 779000,
      imageUrl: "https://images.unsplash.com/photo-1502920917128-1aa500764ce7?w=800&q=80"
    },
    {
      name: "Sony Alpha a6700",
      description: "Powerful mirrorless camera with excellent autofocus and hybrid shooting ability.",
      price: 549000,
      imageUrl: "https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?w=800&q=80"
    },
    {
      name: "Sony ZV-E10 II",
      description: "Creator-friendly camera focused on video, vlogging, and easy everyday use.",
      price: 359000,
      imageUrl: "https://images.unsplash.com/photo-1495707902641-75cac588d2e9?w=800&q=80"
    },
    {
      name: "Nikon Z6 II",
      description: "Versatile full-frame camera delivering strong image quality and professional flexibility.",
      price: 689000,
      imageUrl: "https://images.unsplash.com/photo-1519183071298-a2962eadc61b?w=800&q=80"
    },
    {
      name: "Fujifilm X-T5",
      description: "Stylish premium camera with excellent image quality and strong creative controls.",
      price: 629000,
      imageUrl: "https://images.unsplash.com/photo-1510127034890-ba27508e9f1c?w=800&q=80"
    },
    {
      name: "Panasonic Lumix S5 II",
      description: "Hybrid full-frame camera designed for both video creators and photographers.",
      price: 699000,
      imageUrl: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=800&q=80"
    },
    {
      name: "GoPro Hero 13 Black",
      description: "Action camera built for adventure recording, portability, and rugged performance.",
      price: 169000,
      imageUrl: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&q=80"
    },
    {
      name: "DJI Osmo Pocket 3",
      description: "Compact stabilized camera designed for smooth travel and creator video content.",
      price: 249000,
      imageUrl: "https://images.unsplash.com/photo-1494256997604-768d1f608cac?w=800&q=80"
    },
    {
      name: "Insta360 X4",
      description: "360-degree action camera built for immersive footage and creative capture angles.",
      price: 239000,
      imageUrl: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&q=80"
    }
  ],

  Storage: [
    {
      name: "Samsung T7 Shield 1TB",
      description: "Portable SSD with strong speed, compact design, and durable everyday use.",
      price: 49000,
      imageUrl: "https://images.unsplash.com/photo-1591488320449-011701bb6704?w=800&q=80"
    },
    {
      name: "Samsung 990 Pro 1TB",
      description: "High-performance NVMe SSD for premium gaming and productivity systems.",
      price: 59000,
      imageUrl: "https://images.unsplash.com/photo-1628557044797-f21a177c37ec?w=800&q=80"
    },
    {
      name: "WD Black SN850X 1TB",
      description: "Fast internal SSD designed for powerful desktop and gaming builds.",
      price: 55000,
      imageUrl: "https://images.unsplash.com/photo-1591799265444-d66432b91588?w=800&q=80"
    },
    {
      name: "WD My Passport 2TB",
      description: "Portable external drive ideal for backups, work files, and everyday storage.",
      price: 32000,
      imageUrl: "https://images.unsplash.com/photo-1531492746076-161ca9bcad58?w=800&q=80"
    },
    {
      name: "Seagate Expansion Portable 2TB",
      description: "Simple external hard drive with reliable capacity for personal file storage.",
      price: 29000,
      imageUrl: "https://images.unsplash.com/photo-1531492746076-161ca9bcad58?w=800&q=80"
    },
    {
      name: "Seagate FireCuda 530 1TB",
      description: "High-speed SSD built for demanding gaming and premium PC performance.",
      price: 62000,
      imageUrl: "https://images.unsplash.com/photo-1591799265444-d66432b91588?w=800&q=80"
    },
    {
      name: "Kingston XS1000 1TB",
      description: "Compact external SSD focused on portability and quick file transfers.",
      price: 35000,
      imageUrl: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&q=80"
    },
    {
      name: "Kingston NV2 1TB",
      description: "Affordable NVMe SSD for modern laptops and desktop upgrades.",
      price: 28000,
      imageUrl: "https://images.unsplash.com/photo-1628557044797-f21a177c37ec?w=800&q=80"
    },
    {
      name: "SanDisk Extreme Portable SSD 1TB",
      description: "Rugged portable SSD with reliable performance for travel and work.",
      price: 47000,
      imageUrl: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&q=80"
    },
    {
      name: "Crucial X9 Pro 1TB",
      description: "Portable SSD offering strong everyday performance in a compact design.",
      price: 42000,
      imageUrl: "https://images.unsplash.com/photo-1591488320449-011701bb6704?w=800&q=80"
    }
  ],

  Networking: [
    {
      name: "TP-Link Archer AX55",
      description: "Modern Wi-Fi router built for strong home coverage and stable speeds.",
      price: 39000,
      imageUrl: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&q=80"
    },
    {
      name: "TP-Link Deco X50",
      description: "Mesh Wi-Fi system offering better coverage for medium and large homes.",
      price: 69000,
      imageUrl: "https://images.unsplash.com/photo-1563770660941-10a63607692e?w=800&q=80"
    },
    {
      name: "ASUS RT-AX58U",
      description: "Reliable Wi-Fi 6 router with strong performance for modern households.",
      price: 49000,
      imageUrl: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&q=80"
    },
    {
      name: "ASUS ZenWiFi XT8",
      description: "Premium mesh networking system with strong whole-home wireless coverage.",
      price: 129000,
      imageUrl: "https://images.unsplash.com/photo-1563770660941-10a63607692e?w=800&q=80"
    },
    {
      name: "Netgear Nighthawk AX5400",
      description: "Powerful router designed for heavy streaming, gaming, and smart homes.",
      price: 79000,
      imageUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80"
    },
    {
      name: "Netgear Orbi RBK752",
      description: "Premium mesh system delivering fast speeds and wide wireless coverage.",
      price: 149000,
      imageUrl: "https://images.unsplash.com/photo-1563770660941-10a63607692e?w=800&q=80"
    },
    {
      name: "Linksys Hydra Pro 6",
      description: "Strong dual-band router suitable for work, streaming, and gaming.",
      price: 65000,
      imageUrl: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&q=80"
    },
    {
      name: "D-Link Eagle Pro AI AX1500",
      description: "Affordable smart router designed for reliable everyday wireless performance.",
      price: 29000,
      imageUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80"
    },
    {
      name: "Tenda RX9 Pro",
      description: "Mid-range Wi-Fi router offering stable home internet performance and value.",
      price: 24000,
      imageUrl: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&q=80"
    },
    {
      name: "Mercusys Halo H80X",
      description: "Mesh networking solution built to improve Wi-Fi consistency around the home.",
      price: 55000,
      imageUrl: "https://images.unsplash.com/photo-1563770660941-10a63607692e?w=800&q=80"
    }
  ],

  Monitors: [
    {
      name: "Dell UltraSharp 27",
      description: "Professional monitor with clean color output and productivity-focused design.",
      price: 129000,
      imageUrl: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&q=80"
    },
    {
      name: "LG UltraGear 27 OLED",
      description: "Premium gaming monitor with vivid panel quality and smooth responsiveness.",
      price: 289000,
      imageUrl: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800&q=80"
    },
    {
      name: "Samsung Odyssey G6",
      description: "Curved gaming monitor designed for immersive visuals and smooth gameplay.",
      price: 179000,
      imageUrl: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&q=80"
    },
    {
      name: "ASUS ProArt Display 27",
      description: "Creator-focused monitor with accurate visuals and professional design features.",
      price: 159000,
      imageUrl: "https://images.unsplash.com/photo-1547082299-de196ea013d6?w=800&q=80"
    },
    {
      name: "Acer Nitro XV272U",
      description: "Balanced gaming monitor with strong refresh rate and good daily value.",
      price: 99000,
      imageUrl: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&q=80"
    },
    {
      name: "BenQ MOBIUZ EX2710Q",
      description: "Entertainment and gaming monitor with quality visuals and solid performance.",
      price: 119000,
      imageUrl: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800&q=80"
    },
    {
      name: "MSI MAG 274QRF",
      description: "Gaming monitor offering smooth motion and sharp visual performance.",
      price: 115000,
      imageUrl: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&q=80"
    },
    {
      name: "Gigabyte M27Q",
      description: "Popular productivity and gaming monitor with practical all-round performance.",
      price: 109000,
      imageUrl: "https://images.unsplash.com/photo-1547082299-de196ea013d6?w=800&q=80"
    },
    {
      name: "ViewSonic VX2728J",
      description: "Affordable modern monitor built for casual gaming and content consumption.",
      price: 89000,
      imageUrl: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&q=80"
    },
    {
      name: "HP Omen 27q",
      description: "Gaming monitor with sharp display quality and clean modern styling.",
      price: 105000,
      imageUrl: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800&q=80"
    }
  ],

  "Computer Components": [
    {
      name: "NVIDIA GeForce RTX 4070 Super",
      description: "Powerful graphics card suited for high-end gaming and creative workloads.",
      price: 289000,
      imageUrl: "https://images.unsplash.com/photo-1591488320449-011701bb6704?w=800&q=80"
    },
    {
      name: "NVIDIA GeForce RTX 4080 Super",
      description: "Premium graphics card built for demanding performance and advanced visuals.",
      price: 489000,
      imageUrl: "https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=800&q=80"
    },
    {
      name: "AMD Radeon RX 7900 XT",
      description: "High-performance graphics card delivering strong gaming and creator capability.",
      price: 339000,
      imageUrl: "https://images.unsplash.com/photo-1591799265444-d66432b91588?w=800&q=80"
    },
    {
      name: "Intel Core i7-14700K",
      description: "Powerful desktop processor built for multitasking, gaming, and productivity.",
      price: 149000,
      imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80"
    },
    {
      name: "AMD Ryzen 7 7800X3D",
      description: "High-end processor known for excellent gaming-focused desktop performance.",
      price: 165000,
      imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80"
    },
    {
      name: "Corsair Vengeance DDR5 32GB",
      description: "Fast desktop memory kit suitable for modern gaming and productivity systems.",
      price: 49000,
      imageUrl: "https://images.unsplash.com/photo-1562976540-1502c2145186?w=800&q=80"
    },
    {
      name: "Samsung 990 Pro 2TB",
      description: "Premium NVMe SSD for fast boot times and high-speed file handling.",
      price: 89000,
      imageUrl: "https://images.unsplash.com/photo-1628557044797-f21a177c37ec?w=800&q=80"
    },
    {
      name: "ASUS ROG Strix B650E-F",
      description: "Modern motherboard for premium AMD desktop builds and advanced connectivity.",
      price: 99000,
      imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80"
    },
    {
      name: "Cooler Master ML360L V2",
      description: "Liquid cooling solution designed for strong thermal control in desktop builds.",
      price: 42000,
      imageUrl: "https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=800&q=80"
    },
    {
      name: "Corsair RM850e Power Supply",
      description: "Reliable modular power supply for modern gaming and performance systems.",
      price: 39000,
      imageUrl: "https://images.unsplash.com/photo-1591799265444-d66432b91588?w=800&q=80"
    }
  ]
};

const generateProducts = () => {
  const products = [];

  Object.entries(catalog).forEach(([category, items]) => {
    items.forEach((item, index) => {
      products.push({
        name: item.name,
        description: item.description,
        price: item.price,
        stock: 20 + ((index + 1) * 2),
        category,
        images: [
          {
            url: item.imageUrl,
            publicId: `seed-${category.toLowerCase().replace(/\s+/g, "-")}-${index + 1}`
          }
        ],
        averageRating: Number((4.1 + ((index % 5) * 0.15)).toFixed(1)),
        reviewCount: 12 + ((index + 1) * 7)
      });
    });
  });

  return products;
};

const productionSeed = async () => {
  try {
    console.log("🚀 Starting Production Seeding...");
    await mongoose.connect(ENV.DB_URL);
    console.log("✅ Connected to MongoDB");

    await Product.deleteMany({});
    console.log("🗑️ Old products cleared");

    const products = generateProducts();
    await Product.insertMany(products);
    console.log(`✅ Successfully seeded ${products.length} products across ${Object.keys(catalog).length} categories`);

    await mongoose.connection.close();
    console.log("👋 Seeding complete. Connection closed.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    process.exit(1);
  }
};

productionSeed();