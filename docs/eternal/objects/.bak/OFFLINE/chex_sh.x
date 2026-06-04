object host;
 
void sh_init(object w){
    host = w;
    if( host->query_chextra() )
    {
        destruct( THISO );
        return;
    }
    shadow( w, 1 );
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
    int i;
if(!present("bankobj", environment(host)))
    return(host->query_money()+
     (20*BANKDAEMON->query_balance(host->query_real_name()))/21);
    else return(host->query_money());
}
 
  add_money(int foo){
    if(foo>=((-1)*(host->query_money())) || 
present("bankobj", environment(host)) ) {
        host->add_money(foo);
        return;
    }
    BANKDAEMON->add_amount(host->query_real_name(), (21*foo)/20);
    if(BANKDAEMON->query_balance(host->query_real_name())<0)
    {
        host->add_money(BANKDAEMON->query_balance(
                        host->query_real_name()));
        BANKDAEMON->set_balance(host->query_real_name(), 0);
    }
    tell_object(host, "Thank you for using your Chextra Card!\n");
}

status
query_chextra()
{
    return( 1 );
}
