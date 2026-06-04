/**
 * @(#) newbie_info.c
 * Handles displaying misc newbie information of mortals
 * Peaches 031124
 */

/** 
 * Defines:
 *      save file
 *      channel file
 */
 
#define INFOD "/adm/bin/infotool"
#define CHANNEL_D "/secure/player/commands/channel"

nosave variables inherit MonsterCode;
/** 
 * Global Variables and Function Prototypes
 */
 
public void initiate_message_loop();
public void message_loop();

static int started;

/**
 * Method: create
 * Description:
 *  Initial setup, loads save file
 * Preconditions:
 *      file is loaded
 * Postconditions:
 *      saved info.o is loaded into memory, if it did not previously
 *      exist, variables are initialized as appropriate.
 *      initiate timed loop of messages
 * @param args
 *   none
 */

void create()
{
    ::create();
    set_name("Newbie Helper");
    add_alias("newbie helper");
    add_alias("newbie");
    add_alias("helper");
    set_short("Newbie Helper");
    set_long("This is a newbie helper.  You can currently <hadd> or <hrem> stuff to him. You can view what he knows with <hlist>.");
    
    seteuid(getuid());

    started = 0;
    if(!clonep())
        initiate_message_loop();
}

/**
 * Method: initiate_message_loop()
 * Description:
 *      Initiates message looping
 * @param args
 *   none
 */

public void initiate_message_loop()
{
    if(!started)
    {
        message_loop();
        started = 1;
    }
    return;
}

/**
 * Method: message_loop()
 * Description:
 *      Returns a random message to the channel "info"
 * Preconditions:
 *      info_messages has contents, or has been initialized
 * Postconditions:
 *      a string is printed to the channel "info"
 * @param args
 *   none
 */

public void message_loop()
{
    string mess;
    int i;
    
    mess = INFOD->get_message();
    
    if(mess)
    {
        i = sizeof(INFOD->get_all_messages());
        set_name("Newbie Helper");
        CHANNEL_D->tell_channel(THISO, "info", mess);
        
        i = 1200 / i;
        
        if( i < 240 ) i = 240;
        
        call_out("message_loop", i);
    }
    
    return;
}

int destruct_signal( object dester, object destee )
{
    return 1;
}

string query_name() 
{
    return "Newbie Helper"; 
}
