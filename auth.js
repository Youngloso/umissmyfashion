import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyADf4UCa5gifG0F0Ewq5XRM6-QSoxpMZ10",
    authDomain: "umissmyfashion.firebaseapp.com",
    projectId: "umissmyfashion",
    storageBucket: "umissmyfashion.firebasestorage.app",
    messagingSenderId: "520982702803",
    appId: "1:520982702803:web:9f9ca86412385d4b9a8226",
    measurementId: "G-M1H6KNH1S9"
};

// Export ค่าเริ่มต้นสำหรับการใช้งานในหน้าอื่นๆ
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// --- ฟังก์ชันดึงประวัติการสั่งซื้อ (ดึงมาไว้ด้านบนเพื่อรอเรียกใช้) ---
export const loadUserOrders = async (userId) => {
    const ordersList = document.getElementById('orders-list');
    if (!ordersList) return;

    ordersList.innerHTML = '<tr><td colspan="5" style="text-align:center;">กำลังโหลดข้อมูล...</td></tr>';

    try {
        const q = query(
            collection(db, "orders"), 
            where("userId", "==", userId),
            orderBy("createdAt", "desc") 
        );
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            ordersList.innerHTML = '<tr><td colspan="5" style="text-align:center;">ยังไม่มีประวัติการสั่งซื้อ</td></tr>';
            return;
        }

        ordersList.innerHTML = ''; 
        
        querySnapshot.forEach((doc) => {
            const order = doc.data();
            // แปลงวันที่จาก Firebase Timestamp เป็นวันที่แบบไทย
            const date = order.createdAt?.toDate().toLocaleDateString('th-TH', {
                year: 'numeric', month: 'long', day: 'numeric'
            }) || "กำลังประมวลผล...";

            ordersList.innerHTML += `
                <tr>
                    <td>#${doc.id.substring(0, 7)}</td>
                    <td>${date}</td>
                    <td><span style="color: #f39c12; font-weight: bold;">${order.status}</span></td>
                    <td>฿${order.totalPrice.toLocaleString()}</td>
                    <td><button class="btn-view" onclick="alert('Order ID: ${doc.id}')">รายละเอียด</button></td>
                </tr>
            `;
        });
    } catch (err) {
        console.error("Error loading orders:", err);
        ordersList.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>';
    }
};

// --- ระบบสมัครสมาชิก (Register) ---
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        createUserWithEmailAndPassword(auth, email, password)
            .then(() => {
                alert("สมัครสมาชิกสำเร็จ!");
                window.location.replace("acc.html"); 
            })
            .catch((error) => alert("สมัครไม่สำเร็จ: " + error.message));
    });
}

// --- ระบบเข้าสู่ระบบ (Login) ---
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        signInWithEmailAndPassword(auth, email, password)
            .then(() => {
                alert("เข้าสู่ระบบสำเร็จ!");
                window.location.replace("acc.html"); 
            })
            .catch(() => alert("อีเมลหรือรหัสผ่านไม่ถูกต้อง"));
    });
}

// --- ตรวจสอบสถานะการล็อกอิน ---
onAuthStateChanged(auth, (user) => {
    const isLoginPage = window.location.pathname.includes("login.html");
    const isAccPage = window.location.pathname.includes("acc.html");

    if (user) {
        const shortName = user.email.split('@')[0];

        // อัปเดตการแสดงผลชื่อ User
        const allUserDisplays = document.querySelectorAll('.user-display');
        allUserDisplays.forEach(el => {
            el.innerText = shortName;
        });

        // อัปเดตอีเมลในหน้าข้อมูลบัญชี
        const emailInput = document.getElementById('acc-email-display');
        if (emailInput) emailInput.value = user.email;

        // --- จุดสำคัญ: ดึงข้อมูลออเดอร์ทันทีที่พบ User ---
        if (isAccPage) {
            loadUserOrders(user.uid);
        }

        if (isLoginPage) {
            window.location.replace("acc.html"); 
        } else {
            document.body.style.visibility = "visible";
            document.body.style.opacity = "1";
        }
    } else {
        if (isAccPage) {
            window.location.replace("login.html");
        } else {
            document.body.style.visibility = "visible";
            document.body.style.opacity = "1";
        }
    }
});

// --- ฟังก์ชัน Logout ---
window.logoutUser = () => {
    signOut(auth).then(() => {
        alert("ออกจากระบบเรียบร้อยแล้ว");
        window.location.replace("login.html");
    });
};

// --- ฟังก์ชันสำหรับจัดการที่อยู่ ---
export const getSavedAddress = async () => {
    const user = auth.currentUser;
    if (!user) return null;
    const docRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists() && docSnap.data().address) return docSnap.data().address;
    return null;
};

export const saveAddressFromCheckout = async (data) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
        await setDoc(doc(db, "users", user.uid), { address: data }, { merge: true });
        console.log("ที่อยู่ถูกบันทึกเรียบร้อย");
    } catch (error) {
        console.error("Error syncing address:", error);
    }
};





















import { getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

window.viewOrderDetail = async (orderId) => {
    const modal = document.getElementById('order-modal');
    const content = document.getElementById('modal-content');
    modal.style.display = 'flex';
    content.innerHTML = 'กำลังโหลดข้อมูล...';

    try {
        const orderSnap = await getDoc(doc(db, "orders", orderId));
        if (orderSnap.exists()) {
            const order = orderSnap.data();
            
            // ส่วนนี้คือการสร้าง HTML เพื่อโชว์รายการสินค้า
            let itemsHtml = `<p><strong>รหัสออเดอร์:</strong> #${orderId}</p>`;
            itemsHtml += `<p><strong>สถานะ:</strong> ${order.status}</p><br>`;
            itemsHtml += `<table style="width:100%; border-collapse:collapse;">
                            <tr style="background:#f4f4f4;">
                                <th style="padding:10px; text-align:left;">สินค้า</th>
                                <th style="padding:10px;">จำนวน</th>
                                <th style="padding:10px; text-align:right;">ราคา</th>
                            </tr>`;
            
            // สมมติว่าในออเดอร์มี Field ชื่อ cart เก็บรายการสินค้าไว้
            if(order.items && order.items.length > 0) {
                order.items.forEach(item => {
                    itemsHtml += `
                        <tr>
                            <td style="padding:10px; border-bottom:1px solid #eee;">${item.name} (${item.size || 'N/A'})</td>
                            <td style="padding:10px; border-bottom:1px solid #eee; text-align:center;">x${item.quantity}</td>
                            <td style="padding:10px; border-bottom:1px solid #eee; text-align:right;">฿${(item.price * item.quantity).toLocaleString()}</td>
                        </tr>`;
                });
            } else {
                itemsHtml += `<tr><td colspan="3" style="padding:20px; text-align:center;">ไม่พบข้อมูลรายการสินค้า</td></tr>`;
            }

            itemsHtml += `</table>`;
            itemsHtml += `<h4 style="text-align:right; margin-top:20px;">ยอดรวมสุทธิ: ฿${order.totalPrice.toLocaleString()}</h4>`;
            
            content.innerHTML = itemsHtml;
        }
    } catch (err) {
        content.innerHTML = 'เกิดข้อผิดพลาดในการโหลดข้อมูล';
        console.error(err);
    }
};