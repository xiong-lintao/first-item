const http = require('http')
const url = require('url')
const mysql = require('mysql')
const fs = require('fs')
const io = require('socket.io')

//建立数据库连接
let db = mysql.createPool({host:'localhost',user:'root',password:'',database:'20171116'})

//建立http服务
const httpServer = http.createServer((req,res)=>{
    let {pathname} = url.parse(req.url,true)
    fs.readFile(`www${pathname}`,(err,data)=>{
        if(err){
            res.writeHead(404)
            res.write('mmp---没找到')
        }else{
            res.write(data)
        }
        res.end()
    })
})
httpServer.listen(3000,()=>{
    console.log('3000端口监听成功')
})

//建立websocket服务
let aSock = []
const wsServer = io.listen(httpServer)
wsServer.on('connection',(sock)=>{
    console.log('有人来了')
    aSock.push(sock)
    let cur_user = ''
    let cur_ID = 0


    //注册业务
    sock.on('reg',(user,password)=>{
        //校验数据
        if(!/^\w{6,32}$/.test(user)){
            sock.emit('reg_res',1,'用户名不符合')
        }else if(!/^\w{6,32}$/.test(password)){
            sock.emit('reg_res',1,'密码不合适')
        }else{
            db.query(`SELECT ID,password FROM user_list1 WHERE username='${user}'`,(err,data)=>{
                if(err){
                    sock.emit('reg_res',1,'数据口查询错误')
                }else if(data.length){
                    sock.emit('reg_res',1,'用户名被占用')
                }else{
                    db.query(`INSERT INTO user_list1 (username,password,online) VALUES ('${user}','${password}',0)`,err=>{
                        if(err){
                            sock.emit('reg_res',1,'数据库插入错误')
                        }else{
                            sock.emit('reg_res',0,'注册成功')
                        }
                    })
                }
            })
        }
    })


    //登录业务
    sock.on('login',(user,password)=>{
        //校验数据
        if(!/^\w{6,32}$/.test(user)){
            sock.emit('login_res',1,'用户名不符合')
        }else if(!/^\w{6,32}$/.test(password)){
            sock.emit('login_res',1,'密码不合适')
        }else{
            db.query(`SELECT ID,password FROM user_list1 WHERE username='${user}'`,(err,data)=>{
                if(err){
                    sock.emit('login_res',1,'数据口查询错误')
                }else if(data.length==0){
                    sock.emit('login_res',1,'用户名错误')
                }else if(data[0].password!=password){
                    sock.emit('login_res',1,'密码错误')
                }else{
                    db.query(`UPDATE user_list1 SET online=1 WHERE ID=${data[0].ID}`,err=>{
                        if(err){
                            sock.emit('login_res',1,'数据库更新错误')
                        }else{
                            cur_user = user
                            cur_ID = data[0].ID
                            sock.emit('login_res',0,cur_user)
                        }
                    })
                }
            })
        }
    })

    //聊天业务
    sock.on('msg',(txt)=>{
        if(txt==''){
            sock.emit('msg_res',1,'尼玛，你没打字呀')
        }else{
            aSock.forEach((item)=>{
                if(item==sock)return
        
                item.emit('msg',cur_user,txt)
              })
            sock.emit('msg_res',0,'发送成功')
        }
        
    })

    //下线
//     sock.on('disconnect',()=>{
//         db.query(`UPDATE user_list1 SET online=0 WHERE username='${cur_user}'`,err=>{
//             if(err){
//                 console.log('数据库更新失败')
//             }
//         })
//         aSock = aSock.filter((item)=>{
//             if(item==sock)
//             return false
//         })
//         aSock.forEach((item)=>{
//             item.emit('disconnection',`${cur_user}下线`)
//         })
//         cur_ID = 0
//         cur_user = ''
        
//     })
})