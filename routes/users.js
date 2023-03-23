import express from "express";
const router = express.Router();
import jwt from "jsonwebtoken";

//вытаскиваем модель данных пользователя по базе данных MongoDb
import User  from "../models/User.js";
//вытаскиваем модель данных товара по базе данных MongoDb
import Product from "../models/Product.js";
//вытаскиваем функцию проверки существования авторизованного пользователя
import auth  from "../middleware/auth.js";

//=================================
//             User
//=================================

//маршрутизатор запроса на существование авторизованного пользователя
router.get("/auth", auth, (req, res) => {

    User.findOne({ _id: req.user.userId}, (err, userExist) => 
    {
        //в случае успешного результата от функции auth отправляем всю полученную информацию из этой функции об 
        //авторизованном пользователе на клиент приложение этого проекта
        if (userExist == undefined)
        {
            res.status(200).json({
                isAuth: false
            });
        }
        else
        {
            res.status(200).json({
                _id: userExist._id,
                isAuth: true,
                email: userExist.email,
                name: userExist.name,
                lastname: userExist.lastname,
                image: userExist.image,
                cart: userExist.cart,
            });
        }
    })
});

//маршрутизатор регистрации пользователя
router.post("/register", (req, res) => {
    User.findOne({ email: req.body.email}, (err, userExist) => 
    {
        //существующего пользователя удаляем из базы данных
        if (userExist != undefined)
        {
            User.findOneAndDelete(
            {
                email: req.body.email
            },
            (err, doc) => {
            });
        }

        //создаем модель регистрируемого пользователя по базе данных MongoDb
        const user = new User(req.body);

        //записываем созданную модель регистрируемого пользователя в базу данных
        user.save((err, doc) => {
            //запись не прошла
            if (err) return res.json({ success: false, err });
            //запись прошла
            return res.status(200).json({
                success: true
            });
        });
    })
});

//маршрутизатор авторизации пользователя
router.post("/login", (req, res) => {
    //Ищем пользователя в модели базы данных пользователя по заданной электронной почте req.body.email
    User.findOne({ email: req.body.email }, (err, user) => {
        if (!user)
            return res.json({
                loginSuccess: false,
                message: "Auth failed, email not found"
            });

        //нашли пользователя теперь сравниваем его пароль с заданным паролем req.body.password
        user.comparePassword(req.body.password, (err, isMatch) => {
            //сравнение паролей не прошло
            if (!isMatch)
            {
                return res.json({ loginSuccess: false, message: "Wrong password" });
            }

            //create JWT token
            const token = jwt.sign(
            {
                userId: user._id,
                userEmail: user.email
            },
                "RANDOM-TOKEN",
                {expiresIn: "24h"}
            );

            res.status(200).json({
                //отправляем на клиент-приложение информацию об успешной авторизации пользователя
                loginSuccess: true, 
                token: token,
            });
        });
    });
});

//маршрутизатор запроса на добавление нового товара в корзину авторизованного пользователя
router.get('/addToCart', auth, (req, res) => 
{
    //ищем пользователя по идентификатору req.user.userId
    User.findOne({ _id: req.user.userId }, (err, userInfo) => 
    {
        //имеем полную информацию по авторизованному пользователю userInfo
        //перебираем товары в корзине авторизованного пользователя
        let duplicate = false;
        userInfo.cart.forEach((item) => 
        {
            //в корзине уже есть товар который мы добавляем
            if (item.id == req.query.productId) 
            {
                duplicate = true;
            }
        })

        if (duplicate) 
        {
            //добавляем уже имеющийся товар в корзину
            User.findOneAndUpdate(
                { _id: req.user.userId, "cart.id": req.query.productId },
                //количество товаров с идентификатором req.query.productId увеличиваем на единицу
                { $inc: { "cart.$.quantity": 1 } },
                { new: true },
                (err, userInfo) => 
                {
                    //добавление уже имеющегося товара оказалось не успешным
                    if (err) return res.json({ success: false, err });
                    //добавление уже имеющегося товара оказалось успешным
                    res.status(200).json(userInfo.cart)
                }
            )
        } 
        else 
        {
            //добавляем новый товар в корзину
            User.findOneAndUpdate(
                { _id: req.user.userId },
                {
                    $push: {
                        cart: {
                            id: req.query.productId,
                            quantity: 1,
                            date: Date.now()
                        }
                    }
                },
                { new: true },
                (err, userInfo) => 
                {
                    //добавление нового товара оказалось успешным
                    if (err) return res.json({ success: false, err });
                    //добавление нового товара оказалось не успешным 
                    res.status(200).json(userInfo.cart)
                }
            )
        }
    })
});

//маршрутизатор запроса на удаление серии одинаковых товаров из корзины авторизованного пользователя
router.get('/removeFromCart', auth, (req, res) => 
{
    User.findOneAndUpdate(
        {_id: req.user.userId},
        //производим указанный процесс удаления в корзине товаров авторизованного пользователя с идентификатором req.user._id
        {
            "$pull": {"cart": {"id": req.query._id}}
        },
        {new: true},
        (err, userInfo) => 
        {
            //получаем корзину товаров по авторизованному пользователю
            let cart = userInfo.cart;
            //определяем массив идентификаторов серий одинаковых товаров соответствующий корзине товаров cart
            let array = cart.map(item => 
            {
                return item.id
            })

            //получаем полную информацию о товарах на основании созданного массива array
            Product.find({'_id' : {$in: array}})
            .populate('writer')
            .exec((err, cartDetail) => {
                return res.status(200).json({
                    //выводим на клиент-приложение полную полученную информацию
                    cartDetail,
                    //выводим на клиент-приложение полученную корзину товаров
                    cart
                })
            })
        }
    )
})

//маршрутизатор запроса на получение информации о всех товарах в корзине авторизованного пользователя 
router.get('/userCartInfo', auth, (req,res) => {
    //определяем информацию userInfo по авторизованному пользователю на основании его идентификатора req.user.userId
    User.findOne(
        {_id: req.user.userId},
        (err, userInfo) => {
            //вытаскиваем корзину товаров авторизованного пользователя из всей его полученной информации
            let cart = userInfo.cart;
            //определяем массив идентификаторов по всем товарам в корзине авторизованного пользователя
            let array = cart.map(item =>{
                return item.id
            })
            //собираем информацию о всех товарах в корзине авторизованного пользователя
            Product.find({'_id': {$in: array}})
                //определяем информацию о пользователе который выбрал товар 
                .populate('writer')
                .exec((err, cartDetail) => {
                    //требуемая информация не получена
                    if (err) return res.status(400).send(err);
                    //требуемая информация получена
                    return res.status(200).json({success: true, cartDetail, cart})
                })
        }
    )
})

export default router;