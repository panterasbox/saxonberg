/*  Control object for Eternal City */
 
#define SOUL             "/zone/null/eternal/monsters/soul"
#define SOUL_START       "/zone/null/eternal/room038"
 
#define SOOTHSAYER       "/zone/null/eternal/monsters/soothsayer"
#define SOOTHSAYER_START "/zone/null/eternal/room023"
 
#define IDIOT            "/zone/null/eternal/monsters/idiot"
#define IDIOT_START      "/zone/null/eternal/room027"

#define TAXMAN           "/zone/null/eternal/monsters/tax_man"
#define TAXMAN_START     "/zone/null/eternal/bank"
 
object *soul;
object *idiot;
object *soothsayer;
object *taxman;
 
int i;
 
ready_mob(file, start)
{
    object ob;
 
    ob=clone_object(file);
    move_object(ob, start);
    tell_room(start, capitalize(ob->query_name()) + " arrives.\n");
    return(ob);
}
 
reset1()
{
    for(i=0; i<sizeof(idiot); i++)
        if (!idiot[i])
            idiot[i]=ready_mob(IDIOT, IDIOT_START);
}
 
reset2()
{
    for(i=0; i<sizeof(soothsayer); i++)
        if (!soothsayer[i])
            soothsayer[i]=ready_mob(SOOTHSAYER, SOOTHSAYER_START);
}
 
reset3()
{
    for(i=0; i<sizeof(soul); i++)
        if (!soul[i])
            soul[i]=ready_mob(SOUL, SOUL_START);
}

reset4()
{
    for(i=0; i<sizeof(taxman); i++)
        if (!taxman[i])
            taxman[i]=ready_mob(TAXMAN, TAXMAN_START);
}
 
reset()
{
    call_out("reset1", 1);
    call_out("reset2", 5);
    call_out("reset3", 10);
    call_out("reset4", 15);
}
 
init_objects()
{
    soul=make_array(1);
    idiot=make_array(2);
    soothsayer=make_array(1);
    taxman=make_array(1);
}
 
make_array(size)
{
    object *arr;
 
    arr=allocate(size);
    for(i=0; i<sizeof(arr); i++)
        arr[i]=0;
    return(arr);
}
 
create()
{
    seteuid(getuid());
    init_objects();
    reset();
}
