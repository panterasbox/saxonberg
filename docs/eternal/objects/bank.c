inherit BankCode;

#include <ansi.h>
#define T_ANSI_PAT ({ BLU + "/" + MAG, "-=",  NORM + BLU + "\\" + \
                   NORM, ({ GRN + "|" + NORM, BLU + "|" + NORM }), \
                   ({ GRN + "|" + NORM, BLU + "|" +NORM }), GRN + \
                   "|" + RED, "=", NORM + GRN + "|" + NORM })
#define B_ANSI_PAT ({ BLU + "\\" + NORM, " ", BLU + "\\" + NORM, \
                   ({ GRN + " \\" +NORM, BLU + "  \\" + NORM, GRN + \
                   "  /" + NORM, BLU + " /" + NORM }), ({ GRN + "\\" \
                   + NORM, BLU + "\\" + NORM, GRN + "/" + NORM, BLU +  \
                   "/" + NORM }), GRN + " /" + MAG, "-=", NORM + GRN + \
                   "/" + NORM })
#define T_NORM_PAT ({ "/", "-=", "\\", "|", "|", "|", "=", "|" }) 
#define B_NORM_PAT ({ "\\", " ", "\\", ({ " \\", "  \\", "  /", " /" \
                   }), ({ "\\", "\\", "/", "/" }), " /", "-=", "/" })

string ansi_sign;

void generate_signs()
{
    string text;

    text = "Commands:\n"
           "    balance                      - Inquire about your\n"
           "                                   current balance.\n"
           "     deposit  <amt>               - Deposit <amt> coins\n" 
           "                                    into your account.\n"
           "    withdraw <amt>               - Withdraw <amt> coins\n" 
           "                                   from your account.\n"
           "     transfer <amt> to <person>   - Transfer <amt> coins\n"
           "                                    from your account into\n"
           "                                   <person>'s account.\n"
           "Fees:\n"
           "     balance  - Free\n"
           "     deposit  - 6.00%\n"
           "    withdraw - Free\n"
           "    transfer - 2.00%\n\n"
           "     NOTE: There is a 3% account fee automatically\n"
           "          deducted from your account daily.\n";

     ansi_sign =  "\n" + box_text( "Eternal Savings & Loan \n", 
                  T_ANSI_PAT, 24, 20, 3 );

     ansi_sign += box_text( text, B_ANSI_PAT, 58, 3, 3 );

     norm_sign =  "\n" + box_text( "Eternal Savings & Loan \n", 
                  T_NORM_PAT, 23, 20, 3 );

     norm_sign += box_text( text, B_NORM_PAT, 58, 3, 3 );
}

varargs mixed query( string var, status real_flag ) 
{
    if( var == "long" )
        return norm_sign;

    if( var == "ansi_long" )
        return ansi_sign;

    return( ::query( var, real_flag ) );
}

void create()
{
    ::create();
    generate_signs();
}
