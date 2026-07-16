const ShopData = (() => {
  const storageKeys = {
    drivers: "shopsenegal.drivers",
    places: "shopsenegal.places",
    orders: "shopsenegal.orders",
    users: "shopsenegal.users",
    products: "shopsenegal.products"
  };

  const CLIENT_SESSION_KEY = "shopsenegal.client.session";

  function normalizePhone(value) {
    return String(value ?? "")
      .replace(/\s+/g, "")
      .replace(/[^\d+]/g, "")
      .replace(/^\+/, "");
  }

  function phonesMatch(a, b) {
    const na = normalizePhone(a);
    const nb = normalizePhone(b);
    if (!na || !nb) return false;
    if (na === nb) return true;
    const tail = (digits) => (digits.length >= 9 ? digits.slice(-9) : digits);
    return tail(na) === tail(nb);
  }

  function phoneQueryTail(phone) {
    const norm = normalizePhone(phone);
    return norm.length >= 9 ? norm.slice(-9) : norm;
  }

  function getClientSession() {
    const raw = localStorage.getItem(CLIENT_SESSION_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || !parsed.phone) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function setClientSession(session) {
    if (!session?.phone) return;
    const payload = {
      userId: session.userId || null,
      fullName: String(session.fullName || "").trim(),
      phone: normalizePhone(session.phone) || String(session.phone).trim(),
      address: String(session.address || "").trim()
    };
    localStorage.setItem(CLIENT_SESSION_KEY, JSON.stringify(payload));
  }

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

  function normalizeReferralCode(value) {
    return String(value ?? "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
  }

  function buildReferralCode(fullName, phone) {
    const tail = normalizePhone(phone).slice(-4).padStart(4, "0");
    const parts = String(fullName || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const initials = parts
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() || "")
      .join("")
      .replace(/[^A-Z]/g, "");
    const prefix = (initials || "SS").slice(0, 3);
    const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
    return `${prefix}${tail}${rand}`;
  }

  async function generateUniqueReferralCode(client, fullName, phone) {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const code = buildReferralCode(fullName, phone);
      const { data, error } = await client
        .from("users")
        .select("id")
        .eq("referral_code", code)
        .limit(1);
      if (error) throw error;
      if (!(data || []).length) return code;
    }
    return `SS${Date.now().toString(36).slice(-6).toUpperCase()}`;
  }

  function toUserDb(user) {
    const emailTrimmed =
      typeof user.email === "string" && user.email.trim().length > 0 ? user.email.trim() : null;

    const row = {
      id: user.id,
      full_name: user.fullName,
      phone: user.phone,
      email: emailTrimmed,
      address: user.address,
      password: user.password,
      created_at: user.createdAt
    };
    if (user.referralCode) row.referral_code = user.referralCode;
    if (typeof user.referralCreditFcfa === "number") {
      row.referral_credit_fcfa = Math.round(user.referralCreditFcfa);
    }
    return row;
  }

  function fromUserDb(row) {
    return {
      id: row.id,
      fullName: row.full_name,
      phone: row.phone,
      email: row.email,
      address: row.address,
      password: row.password,
      createdAt: row.created_at,
      referralCode: row.referral_code || "",
      referralCreditFcfa:
        typeof row.referral_credit_fcfa === "number" ? row.referral_credit_fcfa : 0
    };
  }

  function toOrderDb(order) {
    const row = {
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
    if (order.referralCodeUsed) row.referral_code_used = order.referralCodeUsed;
    if (typeof order.deliveryFeeFcfa === "number") row.delivery_fee_fcfa = order.deliveryFeeFcfa;
    if (typeof order.deliveryDiscountFcfa === "number") {
      row.delivery_discount_fcfa = order.deliveryDiscountFcfa;
    }
    if (typeof order.referralRewardGranted === "boolean") {
      row.referral_reward_granted = order.referralRewardGranted;
    }
    return row;
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
        typeof row.estimated_total_fcfa === "number" ? row.estimated_total_fcfa : null,
      referralCodeUsed: row.referral_code_used || "",
      deliveryFeeFcfa: typeof row.delivery_fee_fcfa === "number" ? row.delivery_fee_fcfa : null,
      deliveryDiscountFcfa:
        typeof row.delivery_discount_fcfa === "number" ? row.delivery_discount_fcfa : 0,
      referralRewardGranted: row.referral_reward_granted === true
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

  async function getClientOrders() {
    const session = getClientSession();
    if (!session?.phone) return [];

    const client = getSupabaseClient();
    if (client) {
      const tail = phoneQueryTail(session.phone);
      let query = client.from("orders").select("*").order("created_at", { ascending: false });
      if (tail.length >= 7) {
        query = query.ilike("telephone", `%${tail}`);
      }
      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        return data
          .map(fromOrderDb)
          .filter((order) => phonesMatch(order.telephone, session.phone));
      }
    }

    return read(storageKeys.orders, [])
      .filter((order) => phonesMatch(order.telephone, session.phone))
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
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
        if (order.referralCodeUsed && order.paiement !== "paydunya") {
          await grantReferralRewards(order.id);
        }
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

  async function validateReferralCode(code, options = {}) {
    const normalized = normalizeReferralCode(code);
    if (!normalized) {
      return { valid: false, reason: "empty" };
    }

    const excludePhone = options.excludePhone || null;
    const client = getSupabaseClient();

    if (client) {
      const { data, error } = await client
        .from("users")
        .select("id, full_name, phone, referral_code")
        .eq("referral_code", normalized)
        .limit(1);
      if (error) {
        console.warn("validateReferralCode:", error.message);
        return { valid: false, reason: "db_error" };
      }
      const referrer = (data || [])[0];
      if (!referrer) return { valid: false, reason: "not_found" };
      if (excludePhone && phonesMatch(referrer.phone, excludePhone)) {
        return { valid: false, reason: "self_referral" };
      }
      return {
        valid: true,
        code: normalized,
        referrerId: referrer.id,
        referrerName: referrer.full_name || ""
      };
    }

    const users = read(storageKeys.users, []);
    const referrer = users.find((entry) => normalizeReferralCode(entry.referralCode) === normalized);
    if (!referrer) return { valid: false, reason: "not_found" };
    if (excludePhone && phonesMatch(referrer.phone, excludePhone)) {
      return { valid: false, reason: "self_referral" };
    }
    return {
      valid: true,
      code: normalized,
      referrerId: referrer.id,
      referrerName: referrer.fullName || ""
    };
  }

  async function getUserByPhone(phone) {
    const client = getSupabaseClient();
    if (client) {
      const tail = phoneQueryTail(phone);
      let query = client.from("users").select("*");
      if (tail.length >= 7) query = query.ilike("phone", `%${tail}`);
      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        const match = data.map(fromUserDb).find((user) => phonesMatch(user.phone, phone));
        if (match) return match;
      }
    }
    return read(storageKeys.users, []).find((user) => phonesMatch(user.phone, phone)) || null;
  }

  async function grantReferralRewards(orderId) {
    const client = getSupabaseClient();
    if (!client) return { ok: false, reason: "no_client" };

    const { data: order, error: selErr } = await client
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();
    if (selErr || !order) return { ok: false, reason: "order_not_found" };
    if (order.referral_reward_granted === true) return { ok: true, skipped: true };

    const codeUsed = normalizeReferralCode(order.referral_code_used);
    if (!codeUsed) return { ok: true, skipped: true };

    const subtotal =
      typeof order.estimated_total_fcfa === "number"
        ? Math.round(order.estimated_total_fcfa)
        : 0;
    const creditThreshold = window.ShopPricing?.THRESHOLD_CREDIT ?? 5500;
    const creditAmount = window.ShopPricing?.CREDIT_AMOUNT ?? 300;
    if (subtotal < creditThreshold) return { ok: true, skipped: true };

    const { data: referrerRows, error: refErr } = await client
      .from("users")
      .select("id, phone, referral_credit_fcfa")
      .eq("referral_code", codeUsed)
      .limit(1);
    if (refErr || !(referrerRows || []).length) return { ok: true, skipped: true };

    const referrer = referrerRows[0];
    if (phonesMatch(referrer.phone, order.telephone)) return { ok: true, skipped: true };

    const referrerCredit =
      (typeof referrer.referral_credit_fcfa === "number" ? referrer.referral_credit_fcfa : 0) +
      creditAmount;
    await client
      .from("users")
      .update({ referral_credit_fcfa: referrerCredit })
      .eq("id", referrer.id);

    const referee = await getUserByPhone(order.telephone);
    if (referee && referee.id !== referrer.id) {
      const refereeCredit = (referee.referralCreditFcfa || 0) + creditAmount;
      await client
        .from("users")
        .update({ referral_credit_fcfa: refereeCredit })
        .eq("id", referee.id);
    }

    await client.from("orders").update({ referral_reward_granted: true }).eq("id", orderId);
    return { ok: true };
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

      let referralCode;
      try {
        referralCode = await generateUniqueReferralCode(client, user.fullName, user.phone);
      } catch (genErr) {
        console.warn("registerUser referral code:", genErr);
        return { ok: false, reason: "db_error", message: String(genErr?.message || genErr) };
      }

      const { error } = await client.from("users").insert(
        toUserDb({ ...user, email: emailNorm, referralCode, referralCreditFcfa: 0 })
      );
      if (!error) return { ok: true, referralCode };

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

    const referralCode = buildReferralCode(user.fullName, user.phone);
    users.unshift({
      ...user,
      email: emailNormFallback,
      referralCode,
      referralCreditFcfa: 0
    });
    write(storageKeys.users, users);
    return { ok: true, referralCode };
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

  async function saveCustomerReview(review) {
    const client = getSupabaseClient();
    if (!client) return { ok: true, source: "local" };

    const payload = {
      id: review.id || `r-${Date.now()}`,
      rating: review.rating,
      comment: review.comment || "",
      source: review.source || "visit",
      page: review.page || null,
      order_id: review.orderId || null,
      client_phone: review.clientPhone || null,
      created_at: review.createdAt || new Date().toISOString()
    };

    const { error } = await client.from("customer_reviews").insert(payload);
    if (!error) return { ok: true, source: "supabase" };

    console.warn("ShopData.saveCustomerReview:", error);
    return { ok: false, source: "failed", error: formatSupabasePersistError(error) };
  }

  ensureSeedData();

  function isSupabaseConfigured() {
    return getSupabaseClient() !== null;
  }

  return {
    getDrivers,
    getPlaces,
    getOrders,
    getClientOrders,
    getClientSession,
    setClientSession,
    getUsers,
    getProducts,
    registerUser,
    validateReferralCode,
    getUserByPhone,
    grantReferralRewards,
    saveOrder,
    upsertDriver,
    removeDriver,
    upsertPlace,
    removePlace,
    updateOrder,
    removeOrder,
    removeUser,
    saveCustomerReview,
    upsertProduct,
    removeProduct,
    isSupabaseConfigured
  };
})();

window.ShopData = ShopData;
