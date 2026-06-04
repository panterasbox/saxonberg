// created by Itchy @Eotl
// coded 08-02-93
 
 
#define NOPKILL_OBJECT  "/zone/null/eternal/objects/nopkill_object"


int query_enter_ok( object me )
{
    if( !present( "nopkill_object", me ) )
        move_object( clone_object( NOPKILL_OBJECT ), me );
}
 
int query_leave_ok( object me, object dest )
{
    object ob;

    if( !test_property( dest, "NoCombatP" ) &&
        ob = present( "nopkill_object", me ) )
        destruct( ob );
}
