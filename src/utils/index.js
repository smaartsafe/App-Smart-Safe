import { getAuth } from "firebase/auth";
import { getDatabase, get, ref, child } from "firebase/database";
import { app } from "../config/firebase";

const fetchUserProfile = async () => {
    return new Promise((resolve, reject) => {
        const auth = getAuth();
        const user = auth.currentUser;
    
        if (!user) {
            reject("Nenhum usuario logado")
            return
        }
     
        get(child(ref(getDatabase(app)), `users/${user.uid}`))
        .then(snapshot => {
            if (!snapshot.exists()) {
                reject("Sem dados do usuario")
            }
            resolve(snapshot.val())
        }).catch(err => {
            reject(err)
        })
    })
}

export default {
    fetchUserProfile
}