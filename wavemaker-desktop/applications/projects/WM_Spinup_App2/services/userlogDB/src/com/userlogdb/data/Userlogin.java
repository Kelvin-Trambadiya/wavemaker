package com.userlogdb.data;
// Generated May 29, 2012 10:15:20 AM by Hibernate Tools 3.2.4.GA


import java.util.Date;

/**
 * Userlogin generated by hbm2java
 */
public class Userlogin  implements java.io.Serializable {


     private Integer id;
     private String username;
     private Date login;

    

    
   
    public Integer getId() {
        return this.id;
    }
    
    public void setId(Integer id) {
        this.id = id;
    }
    public String getUsername() {
        return this.username;
    }
    
    public void setUsername(String username) {
        this.username = username;
    }
    public Date getLogin() {
        return this.login;
    }
    
    public void setLogin(Date login) {
        this.login = login;
    }




}


