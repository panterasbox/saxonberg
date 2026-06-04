#define ACCOUNT_OBJECT "/obj/bank/account"
object host;
 
void sh_init(object w){
    host=w;shadow(w,1);
    if(!host){
        destruct(THISO);
        }
    }
 
void extra_reset(){
    if(!host){
        destruct(THISO);
        }
    }
 
/* query_real_money(): shows the actual amount of money on the player
** (not including the chextra.  Use this if you don't want to accept
** the Chextra card and you're not in a fantasy zone.
*/
int query_real_money()
{
    return(host->query_money());
}

int query_money(){
    if(ZONEMASTER->query_zone(ENV(host)) != "fantasy" && !present("bankobj",
       environment(host)))
    return(host->query_money()+
     (20*ACCOUNT_OBJECT->query_balance(host->query_real_name()))/21);
    else return(host->query_money());
}
 
  add_money(int foo){
    if(foo>=((-1)*(host->query_money())) || 
       present("bankobj", environment(host)) ||
        ZONEMASTER->query_zone(environment(host))=="fantasy"){
       /* Tiac - 11-18-94 - env(host)->q_z() returned 0. fixed. */
        host->add_money(foo);
        return;
    }
    ACCOUNT_OBJECT->add_amount(host->query_real_name(), (21*foo)/20);
    if(ACCOUNT_OBJECT->query_balance(host->query_real_name())<0)
    {
        host->add_money(ACCOUNT_OBJECT->query_balance(
                        host->query_real_name()));
        ACCOUNT_OBJECT->set_balance(host->query_real_name(), 0);
    }
    tell_object(host, "Thank you for using your Chextra Card!\n");
}
