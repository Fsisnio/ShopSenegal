const ShopData = (() => {
  const storageKeys = {
    drivers: "shopsenegal.drivers",
    places: "shopsenegal.places",
    orders: "shopsenegal.orders",
    users: "shopsenegal.users"
  };

  const defaultDrivers = [
    {
      id: "d1",
      firstName: "Mamadou",
      lastName: "Ndiaye",
      zone: "Dakar Plateau",
      photo: "https://i.pravatar.cc/200?img=12"
    },
    {
      id: "d2",
      firstName: "Awa",
      lastName: "Diop",
      zone: "Pikine / Guediawaye",
      photo: "https://i.pravatar.cc/200?img=5"
    },
    {
      id: "d3",
      firstName: "Ibrahima",
      lastName: "Fall",
      zone: "Mermoz / Sacre-Coeur",
      photo: "https://i.pravatar.cc/200?img=22"
    },
    {
      id: "d4",
      firstName: "Fatou",
      lastName: "Sarr",
      zone: "Rufisque / Bargny",
      photo: "https://i.pravatar.cc/200?img=32"
    },
    {
      id: "d5",
      firstName: "Cheikh",
      lastName: "Kane",
      zone: "Medina / Fass",
      photo: "https://i.pravatar.cc/200?img=45"
    }
  ];

  const defaultPlaces = [
    { id: "p1", name: "Marche Sandaga", area: "Dakar" },
    { id: "p2", name: "Marche Tilene", area: "Dakar" },
    { id: "p3", name: "Marche Kermel", area: "Dakar" },
    { id: "p4", name: "Auchan", area: "Plusieurs zones" },
    { id: "p5", name: "Auchan Mermoz", area: "Mermoz" },
    { id: "p6", name: "EDK", area: "Plusieurs zones" },
    { id: "p7", name: "Carrefour Liberte", area: "Liberte" },
    { id: "p8", name: "Marches de quartier", area: "Dakar, Thies, Saint-Louis" }
  ];

  function read(key, fallback) {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function ensureSeedData() {
    if (!localStorage.getItem(storageKeys.drivers)) {
      write(storageKeys.drivers, defaultDrivers);
    }
    if (!localStorage.getItem(storageKeys.places)) {
      write(storageKeys.places, defaultPlaces);
    }
    if (!localStorage.getItem(storageKeys.orders)) {
      write(storageKeys.orders, []);
    }
    if (!localStorage.getItem(storageKeys.users)) {
      write(storageKeys.users, []);
    }
  }

  function getSupabaseClient() {
    const config = window.SUPABASE_CONFIG || {};
    const hasConfig =
      typeof config.url === "string" &&
      config.url.length > 0 &&
      typeof config.anonKey === "string" &&
      config.anonKey.length > 0;
    if (!hasConfig || !window.supabase || !window.supabase.createClient) return null;
    return window.supabase.createClient(config.url, config.anonKey);
  }

  function toDriverDb(driver) {
    return {
      id: driver.id,
      first_name: driver.firstName,
      last_name: driver.lastName,
      zone: driver.zone,
      photo: driver.photo
    };
  }

  function fromDriverDb(row) {
    return {
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      zone: row.zone,
      photo: row.photo
    };
  }

  function toPlaceDb(place) {
    return {
      id: place.id,
      name: place.name,
      area: place.area
    };
  }

  function toUserDb(user) {
    return {
      id: user.id,
      full_name: user.fullName,
      phone: user.phone,
      email: user.email,
      address: user.address,
      password: user.password,
      created_at: user.createdAt
    };
  }

  function fromUserDb(row) {
    return {
      id: row.id,
      fullName: row.full_name,
      phone: row.phone,
      email: row.email,
      address: row.address,
      password: row.password,
      createdAt: row.created_at
    };
  }

  function toOrderDb(order) {
    return {
      id: order.id,
      client: order.client,
      telephone: order.telephone,
      adresse: order.adresse,
      note: order.note,
      creneau: order.creneau,
      paiement: order.paiement,
      besoins: order.besoins,
      photos: order.photos,
      status: order.status,
      payment_status: order.paymentStatus,
      assigned_driver: order.assignedDriver || null,
      created_at: order.createdAt
    };
  }

  function fromOrderDb(row) {
    return {
      id: row.id,
      client: row.client,
      telephone: row.telephone,
      adresse: row.adresse,
      note: row.note,
      creneau: row.creneau,
      paiement: row.paiement,
      besoins: Array.isArray(row.besoins) ? row.besoins : [],
      photos: row.photos,
      status: row.status,
      paymentStatus: row.payment_status || "Non paye",
      assignedDriver: row.assigned_driver || "",
      createdAt: row.created_at
    };
  }

  async function seedSupabaseIfEmpty(client) {
    const driversResult = await client.from("drivers").select("id").limit(1);
    if (!driversResult.error && (driversResult.data || []).length === 0) {
      await client.from("drivers").insert(defaultDrivers.map(toDriverDb));
    }

    const placesResult = await client.from("places").select("id").limit(1);
    if (!placesResult.error && (placesResult.data || []).length === 0) {
      await client.from("places").insert(defaultPlaces.map(toPlaceDb));
    }
  }

  async function getDrivers() {
    const client = getSupabaseClient();
    if (client) {
      await seedSupabaseIfEmpty(client);
      const { data, error } = await client.from("drivers").select("*").order("first_name");
      if (!error && Array.isArray(data)) return data.map(fromDriverDb);
    }
    return read(storageKeys.drivers, defaultDrivers);
  }

  async function getPlaces() {
    const client = getSupabaseClient();
    if (client) {
      await seedSupabaseIfEmpty(client);
      const { data, error } = await client.from("places").select("*").order("name");
      if (!error && Array.isArray(data)) return data;
    }
    return read(storageKeys.places, defaultPlaces);
  }

  async function getOrders() {
    const client = getSupabaseClient();
    if (client) {
      const { data, error } = await client
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && Array.isArray(data)) return data.map(fromOrderDb);
    }
    return read(storageKeys.orders, []);
  }

  async function saveOrder(order) {
    const client = getSupabaseClient();
    if (client) {
      const { error } = await client.from("orders").insert(toOrderDb(order));
      if (!error) return;
    }
    const orders = read(storageKeys.orders, []);
    orders.unshift(order);
    write(storageKeys.orders, orders);
  }

  async function getUsers() {
    const client = getSupabaseClient();
    if (client) {
      const { data, error } = await client
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && Array.isArray(data)) return data.map(fromUserDb);
    }
    return read(storageKeys.users, []);
  }

  async function registerUser(user) {
    const client = getSupabaseClient();
    if (client) {
      let query = client.from("users").select("id").eq("phone", user.phone).limit(1);
      if (user.email) query = query.or(`email.eq.${user.email},phone.eq.${user.phone}`);
      const { data: existingRows } = await query;
      if ((existingRows || []).length > 0) return { ok: false, reason: "exists" };
      const { error } = await client.from("users").insert(toUserDb(user));
      if (!error) return { ok: true };
    }

    const users = read(storageKeys.users, []);
    const exists = users.some(
      (entry) =>
        entry.phone === user.phone || (entry.email && user.email && entry.email === user.email)
    );
    if (exists) return { ok: false, reason: "exists" };
    users.unshift(user);
    write(storageKeys.users, users);
    return { ok: true };
  }

  async function upsertDriver(driver) {
    const id = driver.id || `d${Date.now()}`;
    const payload = { ...driver, id };
    const client = getSupabaseClient();
    if (client) {
      const { error } = await client.from("drivers").upsert(toDriverDb(payload), { onConflict: "id" });
      if (!error) return;
    }
    const drivers = read(storageKeys.drivers, defaultDrivers);
    drivers.unshift(payload);
    write(storageKeys.drivers, drivers);
  }

  async function removeDriver(id) {
    const client = getSupabaseClient();
    if (client) {
      const { error } = await client.from("drivers").delete().eq("id", id);
      if (!error) return;
    }
    const drivers = read(storageKeys.drivers, defaultDrivers).filter((driver) => driver.id !== id);
    write(storageKeys.drivers, drivers);
  }

  async function upsertPlace(place) {
    const id = place.id || `p${Date.now()}`;
    const payload = { ...place, id };
    const client = getSupabaseClient();
    if (client) {
      const { error } = await client.from("places").upsert(toPlaceDb(payload), { onConflict: "id" });
      if (!error) return;
    }
    const places = read(storageKeys.places, defaultPlaces);
    places.unshift(payload);
    write(storageKeys.places, places);
  }

  async function removePlace(id) {
    const client = getSupabaseClient();
    if (client) {
      const { error } = await client.from("places").delete().eq("id", id);
      if (!error) return;
    }
    const places = read(storageKeys.places, defaultPlaces).filter((place) => place.id !== id);
    write(storageKeys.places, places);
  }

  async function updateOrder(orderId, patch) {
    const client = getSupabaseClient();
    if (client) {
      const updatePayload = {};
      if (Object.prototype.hasOwnProperty.call(patch, "status")) {
        updatePayload.status = patch.status;
      }
      if (Object.prototype.hasOwnProperty.call(patch, "assignedDriver")) {
        updatePayload.assigned_driver = patch.assignedDriver || null;
      }
      if (Object.prototype.hasOwnProperty.call(patch, "paymentStatus")) {
        updatePayload.payment_status = patch.paymentStatus;
      }
      const { error } = await client.from("orders").update(updatePayload).eq("id", orderId);
      if (!error) return;
    }

    const orders = read(storageKeys.orders, []).map((order) =>
      order.id === orderId ? { ...order, ...patch } : order
    );
    write(storageKeys.orders, orders);
  }

  ensureSeedData();

  return {
    getDrivers,
    getPlaces,
    getOrders,
    getUsers,
    registerUser,
    saveOrder,
    upsertDriver,
    removeDriver,
    upsertPlace,
    removePlace,
    updateOrder
  };
})();

window.ShopData = ShopData;
