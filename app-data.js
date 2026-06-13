const ShopData = (() => {
  const storageKeys = {
    drivers: "shopsenegal.drivers",
    places: "shopsenegal.places",
    orders: "shopsenegal.orders",
    users: "shopsenegal.users",
    products: "shopsenegal.products"
  };

  const defaultDrivers = [
    {
      id: "d1",
      firstName: "Mamadou",
      lastName: "Ndiaye",
      zone: "Thiès centre",
      photo: "https://i.pravatar.cc/200?img=12"
    },
    {
      id: "d2",
      firstName: "Awa",
      lastName: "Diop",
      zone: "Thiès Keur Mbaye Fall",
      photo: "https://i.pravatar.cc/200?img=5"
    },
    {
      id: "d3",
      firstName: "Ibrahima",
      lastName: "Fall",
      zone: "Thiès Tilène",
      photo: "https://i.pravatar.cc/200?img=22"
    },
    {
      id: "d4",
      firstName: "Fatou",
      lastName: "Sarr",
      zone: "Thiès Grand Standing",
      photo: "https://i.pravatar.cc/200?img=32"
    },
    {
      id: "d5",
      firstName: "Cheikh",
      lastName: "Kane",
      zone: "Thiès sortie Dakar",
      photo: "https://i.pravatar.cc/200?img=45"
    }
  ];

  /** Marchés et lieux d'emplette de la ville de Thiès, Sénégal */
  const defaultPlaces = [
    { id: "p1", name: "Marché Assane Lô", area: "Thiès centre" },
    { id: "p2", name: "Marché Tilène", area: "Thiès" },
    { id: "p3", name: "Marché Keur Mbaye Fall", area: "Thiès" },
    { id: "p4", name: "Marché Grand Standing", area: "Thiès" },
    { id: "p5", name: "Marché Thiaday", area: "Thiès" },
    { id: "p6", name: "Marché Manko", area: "Thiès" },
    { id: "p7", name: "Marché Ngangate", area: "Thiès" },
    { id: "p8", name: "Auchan Thiès", area: "Thiès" },
    { id: "p9", name: "Casino Thiès", area: "Thiès" },
    { id: "p10", name: "Marché de quartier (Thiès)", area: "Thiès" },
    { id: "p11", name: "Carrefour Thiès", area: "Thiès" },
    { id: "p12", name: "EDK Thiès", area: "Thiès" }
  ];

  const THIES_AREA_PATTERN = /thi[eè]s/i;

  function isThiesMarket(place) {
    if (!place || typeof place !== "object") return false;
    const area = String(place.area ?? "");
    const name = String(place.name ?? "");
    return THIES_AREA_PATTERN.test(area) || THIES_AREA_PATTERN.test(name);
  }

  function filterThiesPlaces(places) {
    return (Array.isArray(places) ? places : []).filter(isThiesMarket);
  }

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
    const placesDataVersion = "thies-2026-v2";
    if (localStorage.getItem("shopsenegal.places.version") !== placesDataVersion) {
      write(storageKeys.places, defaultPlaces);
      localStorage.setItem("shopsenegal.places.version", placesDataVersion);
    }
    if (!localStorage.getItem(storageKeys.orders)) {
      write(storageKeys.orders, []);
    }
    if (!localStorage.getItem(storageKeys.users)) {
      write(storageKeys.users, []);
    }
    if (!localStorage.getItem(storageKeys.products)) {
      write(storageKeys.products, []);
    }
  }

  function getSupabaseClient() {
    if (window.ShopAdminAuth?.getClient) {
      const adminClient = window.ShopAdminAuth.getClient();
      if (adminClient) return adminClient;
    }
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

  function fromPlaceDb(row) {
    return {
      id: row.id,
      name: row.name,
      area: row.area
    };
  }

  function isStaleLegacyPlace(place) {
    const area = String(place?.area ?? "");
    return /dakar|saint-louis/i.test(area);
  }

  function mergeThiesPlacesCatalog(dbPlaces) {
    const byId = new Map(defaultPlaces.map((place) => [place.id, place]));
    (Array.isArray(dbPlaces) ? dbPlaces : [])
      .map(fromPlaceDb)
      .filter((place) => isThiesMarket(place) && !isStaleLegacyPlace(place))
      .forEach((place) => {
        if (!byId.has(place.id)) byId.set(place.id, place);
      });
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, "fr"));
  }

  async function syncThiesPlacesCatalog(client) {
    const { error: upsertError } = await client
      .from("places")
      .upsert(defaultPlaces.map(toPlaceDb), { onConflict: "id" });
    if (upsertError) {
      console.warn("ShopData.syncThiesPlacesCatalog upsert:", upsertError);
      return false;
    }

    const { data, error: selectError } = await client.from("places").select("id, name, area");
    if (selectError || !Array.isArray(data)) {
      console.warn("ShopData.syncThiesPlacesCatalog select:", selectError);
      return false;
    }

    const staleIds = data.filter(isStaleLegacyPlace).map((row) => row.id);
    if (staleIds.length > 0) {
      const { error: deleteError } = await client.from("places").delete().in("id", staleIds);
      if (deleteError) console.warn("ShopData.syncThiesPlacesCatalog delete:", deleteError);
    }
    return true;
  }

  function toUserDb(user) {
    const emailTrimmed =
      typeof user.email === "string" && user.email.trim().length > 0 ? user.email.trim() : null;

    return {
      id: user.id,
      full_name: user.fullName,
      phone: user.phone,
      email: emailTrimmed,
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
      created_at: order.createdAt,
      paydunya_invoice_token: order.paydunyaInvoiceToken || null,
      estimated_total_fcfa: order.estimatedTotalFcfa ?? null
    };
  }

  function toProductDb(product) {
    return {
      id: product.id,
      name: product.name,
      brand: product.brand || null,
      category: product.category || null,
      description: product.description || null,
      price_fcfa:
        typeof product.priceFcfa === "number" && Number.isFinite(product.priceFcfa)
          ? Math.round(product.priceFcfa)
          : null,
      image_url: product.imageUrl || null,
      source_url: product.sourceUrl || null,
      in_stock: product.inStock !== false,
      updated_at: new Date().toISOString()
    };
  }

  function fromProductDb(row) {
    return {
      id: row.id,
      name: row.name || "",
      brand: row.brand || "",
      category: row.category || "",
      description: row.description || "",
      priceFcfa: typeof row.price_fcfa === "number" ? row.price_fcfa : null,
      imageUrl: row.image_url || "",
      sourceUrl: row.source_url || "",
      inStock: row.in_stock !== false,
      createdAt: row.created_at || null,
      updatedAt: row.updated_at || null
    };
  }

  function formatSupabasePersistError(error) {
    if (!error) return "";
    const parts = [error.message, error.details, error.hint].filter(
      (p) => typeof p === "string" && p.trim().length > 0
    );
    return parts.join(" — ").trim();
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
      createdAt: row.created_at,
      paydunyaInvoiceToken: row.paydunya_invoice_token || "",
      estimatedTotalFcfa:
        typeof row.estimated_total_fcfa === "number" ? row.estimated_total_fcfa : null
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
      await syncThiesPlacesCatalog(client);
      const { data, error } = await client.from("places").select("*").order("name");
      if (!error && Array.isArray(data)) {
        return mergeThiesPlacesCatalog(data);
      }
    }
    ensureSeedData();
    return mergeThiesPlacesCatalog(read(storageKeys.places, defaultPlaces));
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

  /**
   * Persiste une commande. Retour objet :
   * - { ok: true, source: "supabase" } — ligne dans public.orders (visible admin / SQL).
   * - { ok: true, source: "local" } — pas de client Supabase : uniquement navigateur (localStorage).
   * - { ok: true, source: "local_fallback", error } — Supabase a refusé l’INSERT ; sauvegarde locale de secours.
   * - { ok: false, source: "failed", error } — mode exclusif DB (Paydunya) et refus INSERT.
   */
  async function saveOrder(order, options = {}) {
    const supabaseExclusive = options.supabaseExclusive === true;
    const client = getSupabaseClient();

    function persistLocally() {
      const orders = read(storageKeys.orders, []);
      orders.unshift(order);
      write(storageKeys.orders, orders);
    }

    if (client) {
      const { error } = await client.from("orders").insert(toOrderDb(order));
      if (!error) {
        return { ok: true, source: "supabase" };
      }
      const errText = formatSupabasePersistError(error) || "Insertion refusée.";
      console.warn("ShopData.saveOrder Supabase:", error);
      if (supabaseExclusive) {
        return { ok: false, source: "failed", error: errText };
      }
      persistLocally();
      return { ok: true, source: "local_fallback", error: errText };
    }

    persistLocally();
    return { ok: true, source: "local" };
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
      const emailNorm =
        typeof user.email === "string" && user.email.trim().length > 0 ? user.email.trim() : null;

      const { data: byPhone, error: errPhone } = await client
        .from("users")
        .select("id")
        .eq("phone", user.phone)
        .limit(1);
      if (errPhone) {
        console.warn("registerUser duplicate check (phone):", errPhone.message);
        return { ok: false, reason: "db_error", message: errPhone.message };
      }
      if ((byPhone || []).length > 0) return { ok: false, reason: "exists" };

      if (emailNorm) {
        const { data: byEmail, error: errEmail } = await client
          .from("users")
          .select("id")
          .eq("email", emailNorm)
          .limit(1);
        if (errEmail) {
          console.warn("registerUser duplicate check (email):", errEmail.message);
          return { ok: false, reason: "db_error", message: errEmail.message };
        }
        if ((byEmail || []).length > 0) return { ok: false, reason: "exists" };
      }

      const { error } = await client.from("users").insert(toUserDb({ ...user, email: emailNorm }));
      if (!error) return { ok: true };

      console.warn("registerUser insert:", error.message);
      const code = error.code ?? "";
      const msg = `${error.message} ${code}`.trim();
      if (
        code === "23505" ||
        /duplicate key|already exists|unique constraint/i.test(msg)
      ) {
        return { ok: false, reason: "exists" };
      }
      return { ok: false, reason: "db_error", message: msg };
    }

    const emailNormFallback =
      typeof user.email === "string" && user.email.trim().length > 0 ? user.email.trim() : "";
    const users = read(storageKeys.users, []);
    const exists = users.some((entry) => {
      const em = typeof entry.email === "string" ? entry.email.trim() : "";
      return (
        entry.phone === user.phone ||
        (!!emailNormFallback && !!em && em === emailNormFallback)
      );
    });
    if (exists) return { ok: false, reason: "exists" };

    users.unshift({
      ...user,
      email: emailNormFallback
    });
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
      if (Object.prototype.hasOwnProperty.call(patch, "paydunyaInvoiceToken")) {
        updatePayload.paydunya_invoice_token = patch.paydunyaInvoiceToken || null;
      }
      if (Object.prototype.hasOwnProperty.call(patch, "estimatedTotalFcfa")) {
        updatePayload.estimated_total_fcfa = patch.estimatedTotalFcfa;
      }
      const { error } = await client.from("orders").update(updatePayload).eq("id", orderId);
      if (!error) return;
    }

    const orders = read(storageKeys.orders, []).map((order) =>
      order.id === orderId ? { ...order, ...patch } : order
    );
    write(storageKeys.orders, orders);
  }

  async function getProducts() {
    const client = getSupabaseClient();
    if (client) {
      const { data, error } = await client
        .from("products")
        .select("*")
        .order("name", { ascending: true });
      if (!error && Array.isArray(data)) return data.map(fromProductDb);
      if (error) console.warn("ShopData.getProducts Supabase:", error.message);
    }
    return read(storageKeys.products, []);
  }

  async function upsertProduct(product) {
    const id = product.id || `prd-${Date.now()}`;
    const payload = { ...product, id };
    const client = getSupabaseClient();
    if (client) {
      const { error } = await client
        .from("products")
        .upsert(toProductDb(payload), { onConflict: "id" });
      if (!error) return { ok: true, source: "supabase", id };
      const errText = formatSupabasePersistError(error) || "Upsert refus\u00e9.";
      console.warn("ShopData.upsertProduct Supabase:", error);
      // pas de fallback en local quand Supabase est branch\u00e9 : on remonte l'erreur
      return { ok: false, source: "failed", error: errText };
    }
    const products = read(storageKeys.products, []);
    const idx = products.findIndex((p) => p.id === id);
    if (idx >= 0) products[idx] = { ...products[idx], ...payload };
    else products.unshift({ ...payload, createdAt: new Date().toISOString() });
    write(storageKeys.products, products);
    return { ok: true, source: "local", id };
  }

  async function removeProduct(id) {
    const client = getSupabaseClient();
    if (client) {
      const { error } = await client.from("products").delete().eq("id", id);
      if (!error) return { ok: true, source: "supabase" };
      const errText = formatSupabasePersistError(error) || "Suppression refus\u00e9e.";
      console.warn("ShopData.removeProduct Supabase:", error);
      return { ok: false, source: "failed", error: errText };
    }
    const products = read(storageKeys.products, []).filter((p) => p.id !== id);
    write(storageKeys.products, products);
    return { ok: true, source: "local" };
  }

  async function removeOrder(id) {
    const client = getSupabaseClient();
    if (client) {
      const { error } = await client.from("orders").delete().eq("id", id);
      if (!error) return { ok: true, source: "supabase" };
      const errText = formatSupabasePersistError(error) || "Suppression refus\u00e9e.";
      console.warn("ShopData.removeOrder Supabase:", error);
      return { ok: false, source: "failed", error: errText };
    }
    const orders = read(storageKeys.orders, []).filter((o) => o.id !== id);
    write(storageKeys.orders, orders);
    return { ok: true, source: "local" };
  }

  async function removeUser(id) {
    const client = getSupabaseClient();
    if (client) {
      const { error } = await client.from("users").delete().eq("id", id);
      if (!error) return { ok: true, source: "supabase" };
      const errText = formatSupabasePersistError(error) || "Suppression refus\u00e9e.";
      console.warn("ShopData.removeUser Supabase:", error);
      return { ok: false, source: "failed", error: errText };
    }
    const users = read(storageKeys.users, []).filter((u) => u.id !== id);
    write(storageKeys.users, users);
    return { ok: true, source: "local" };
  }

  ensureSeedData();

  function isSupabaseConfigured() {
    return getSupabaseClient() !== null;
  }

  return {
    getDrivers,
    getPlaces,
    getOrders,
    getUsers,
    getProducts,
    registerUser,
    saveOrder,
    upsertDriver,
    removeDriver,
    upsertPlace,
    removePlace,
    updateOrder,
    removeOrder,
    removeUser,
    upsertProduct,
    removeProduct,
    isSupabaseConfigured
  };
})();

window.ShopData = ShopData;
