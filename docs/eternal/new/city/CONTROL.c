/*  Control object for Eternal City */

#define SOUL             "/zone/null/eternal/monsters/soul"
#define SOUL_START       "/zone/null/eternal/room038"

#define CITYGUARD        "/zone/null/eternal/monsters/diku_cityguard"
#define CITYGUARD_START  "/zone/null/eternal/room023"

#define IDIOT            "/zone/null/eternal/monsters/idiot"
#define IDIOT_START      "/zone/null/eternal/room027"

object *soul;
object *idiot;
object *cityguard;

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
    for(i=0; i<sizeof(cityguard); i++)
        if (!cityguard[i])
            cityguard[i]=ready_mob(CITYGUARD, CITYGUARD_START);
}

reset3()
{
    for(i=0; i<sizeof(soul); i++)
        if (!soul[i])
            soul[i]=ready_mob(SOUL, SOUL_START);
}

reset()
{
    call_out("reset1", 1);
    call_out("reset2", 5);
    call_out("reset3", 10);
}

init_objects()
{
    soul=make_array(1);
    idiot=make_array(2);
    cityguard=make_array(1);
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
