/* potioncode.c
 * base code for potion objects
 * death - 12 Jul 94
 */
string look, id_short;
int uses, value;
object *identee;
 
set_id_short(string arg) 
{
    if(arg) id_short = arg;
}
 
set_look(string arg)
{
    if(arg) look=arg;
}
 
set_uses(int arg)
{
    if(!uses) uses=arg; 
    /* prevent a wiz from jacking up # of uses */
}
 
quaff(string arg)
{
    if (!id(arg)) return;
    write("You drink the "+look+" potion.\n");
    tell_room(environment(THISP),THISP->query_name() +
      " drinks the "+look+" potion.\n",({THISP}));
    drink();
    identee += ({THISP});
    if(--uses < 1)
    {
        write("You finish off the potion.\n");
        destruct(THISO);
    }
    return 1;
}
 
get()
{
    return 1;
}
 
short()
{
    return ("a"+((IsVowel( look[1] ))?"n ":" ")+look+" potion");
}
 
long()
{
    if(member(identee, THISP)!=-1) return id_short;
    write("This is a little "+look+" potion.  I wonder what it does?\n");
}
 
set_value(int arg)
{
    value=arg;
}
 
id(string arg)
{
    return (arg=="potion" || arg==look+" potion");
}
 
query_value()
{
    return value * uses;
}
 
query_weight()
{
    return 1+ uses;
}
 
drink() 
{
    write("Nothing happens.\n");
}
 
set_name(string str) { return 1; }
 
create()
{
    identee = ({ });
    set_look("clear");
    extra_create();
}
 
init()
{
    add_action("quaff","drink");
    add_action("quaff","quaff");
    extra_init();
}
 
reset() 
{
    extra_reset();
}
 
void extra_create() {}
void extra_init() {}
void extra_reset() {}
